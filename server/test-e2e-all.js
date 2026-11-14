#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { io: connectSocket } = require('socket.io-client');

process.env.JWT_SECRET ||= 'local-e2e-only-secret-change-before-production';

const { connectDatabase } = require('./src/db/connect');
const { createHttpServer } = require('./src/server');
const { User, Menu, Order, Bill, Confession } = require('./src/models');

const TEST_URI = process.env.TEST_MONGODB_URI;
const ADMIN_USERNAME = 'e2e-admin';
const ADMIN_PASSWORD = 'e2e-admin-password-2026';
const SOCKET_TIMEOUT_MS = 8000;

function requireSafeTestDatabase(uri) {
  if (!uri) throw new Error('Set TEST_MONGODB_URI to a dedicated MongoDB test database before running this script.');
  let databaseName;
  try { databaseName = decodeURIComponent(new URL(uri).pathname.replace(/^\/+/, '').split('/')[0]); }
  catch { throw new Error('TEST_MONGODB_URI must be a valid MongoDB connection URI.'); }
  if (!/(^|[-_])(?:test|e2e)(?:[-_]|$)/i.test(databaseName)) {
    throw new Error(`Refusing to seed database "${databaseName}". Its name must include a separate "test" or "e2e" segment.`);
  }
}

function waitForConnect(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connection timed out')), SOCKET_TIMEOUT_MS);
    socket.once('connect', () => { clearTimeout(timer); resolve(); });
    socket.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
  });
}

function waitForSocketEvent(socket, eventName, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(new Error(`Timed out waiting for Socket.io event "${eventName}"`));
    }, SOCKET_TIMEOUT_MS);
    function onEvent(payload) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(eventName, onEvent);
      resolve(payload);
    }
    socket.on(eventName, onEvent);
  });
}

function emitAck(socket, eventName, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(SOCKET_TIMEOUT_MS).emit(eventName, payload, (timeoutError, result) => {
      if (timeoutError) return reject(new Error(`No acknowledgement for Socket.io event "${eventName}"`));
      resolve(result);
    });
  });
}

async function startHttpServer(httpServer) {
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${httpServer.address().port}`;
}

async function seedDatabase() {
  await Promise.all([User, Menu, Order, Bill, Confession].map((model) => model.deleteMany({})));
  await User.create({
    username: ADMIN_USERNAME,
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
    role: 'admin'
  });

  const fixtures = [
    { name: 'Cafe Latte', category: 'Beverages', description: 'Double espresso with steamed milk', price: 4.5, prepTimeMinutes: 5 },
    { name: 'Cappuccino', category: 'Beverages', description: 'Espresso with silky foam', price: 5, prepTimeMinutes: 6 },
    { name: 'Butter Croissant', category: 'Snacks', description: 'Flaky and baked fresh', price: 3.75, prepTimeMinutes: 3 },
    { name: 'Blueberry Muffin', category: 'Snacks', description: 'Baked this morning', price: 3.25, prepTimeMinutes: 2 },
    { name: 'Chocolate Cake', category: 'Desserts', description: 'Dark chocolate and cream', price: 6.5, prepTimeMinutes: 2 }
  ];
  return Menu.insertMany(fixtures.map((item) => ({ ...item, imageUrl: '', isAvailable: true })));
}

async function run() {
  requireSafeTestDatabase(TEST_URI);
  await connectDatabase(TEST_URI);
  const menuItems = await seedDatabase();
  const menuByName = new Map(menuItems.map((item) => [item.name, item]));
  console.log('Setup: seeded admin, 3 categories, and 5 menu items.');

  const serverBundle = createHttpServer();
  const { httpServer, io, app } = serverBundle;
  const baseUrl = await startHttpServer(httpServer);
  let adminSocket;
  let customerSocket;
  let orderId;
  let billId;
  let confessionId;

  try {
    const tableUrl = new URL('https://domain.com/?table=3');
    const tableParserUrl = pathToFileURL(path.resolve(__dirname, '..', 'client', 'src', 'tableNumber.js'));
    const { getTableNumberFromSearch } = await import(tableParserUrl.href);
    const selectedTable = getTableNumberFromSearch(tableUrl.search);
    assert.equal(selectedTable, '3', 'The customer checkout should preselect table 3 from the QR query.');

    // An authenticated kitchen socket must be listening before the guest submits a ticket.
    const login = await request(baseUrl).post('/api/auth/login').send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }).expect(200);
    assert.equal(typeof login.body.token, 'string');
    adminSocket = connectSocket(baseUrl, { auth: { token: login.body.token }, transports: ['websocket'] });
    customerSocket = connectSocket(baseUrl, { transports: ['websocket'] });
    await Promise.all([waitForConnect(adminSocket), waitForConnect(customerSocket)]);

    const kitchenTicketPromise = waitForSocketEvent(adminSocket, 'newOrderReceived');
    const customerOrderResult = await emitAck(customerSocket, 'placeOrder', {
      customerName: 'E2E Guest',
      tableNumber: selectedTable,
      total: 0.01,
      items: [
        { menuItemId: String(menuByName.get('Cafe Latte')._id), quantity: 2, customNotes: 'Oat milk, extra hot' },
        { menuItemId: String(menuByName.get('Butter Croissant')._id), quantity: 1, customNotes: 'Warm if possible' }
      ]
    });
    assert.equal(customerOrderResult.ok, true, customerOrderResult.error);
    const customerOrder = customerOrderResult.order;
    orderId = customerOrder.orderId;
    const newKitchenTicket = await kitchenTicketPromise;
    assert.equal(newKitchenTicket.orderId, orderId);
    assert.equal(customerOrder.tableNumber, '3');
    assert.equal(customerOrder.orderStatus, 'Received');
    assert.equal(customerOrder.items.length, 2);
    assert.equal(customerOrder.totalAmount, 12.75, 'The server must calculate price from MongoDB, not the client total.');
    const savedOrder = await Order.findOne({ orderId });
    assert.equal(savedOrder.orderStatus, 'Received');
    assert.equal(savedOrder.paymentStatus, 'Pending');
    assert.equal(savedOrder.items[0].customNotes, 'Oat milk, extra hot');
    console.log(`Customer: table ${selectedTable} placed order ${orderId}; kitchen received it.`);

    // A second login assertion covers the admin's HTTP access used during management and billing.
    const adminLogin = await request(baseUrl).post('/api/auth/login').send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }).expect(200);
    const adminHeaders = { Authorization: `Bearer ${adminLogin.body.token}` };

    const unavailableItem = menuByName.get('Blueberry Muffin');
    await request(baseUrl).patch(`/api/menu/${unavailableItem.id}/is-available`).set(adminHeaders).send({ isAvailable: false }).expect(200);
    const publicMenu = await request(baseUrl).get('/api/menu').expect(200);
    assert.equal(publicMenu.body.items.find((item) => item._id === unavailableItem.id).isAvailable, false);
    const availableOnly = await request(baseUrl).get('/api/menu?available=true').expect(200);
    assert.equal(availableOnly.body.items.some((item) => item._id === unavailableItem.id), false);
    console.log('Admin: marked Blueberry Muffin out of stock; public menu reflects it.');

    const invalidIdResult = await emitAck(customerSocket, 'placeOrder', {
      tableNumber: '3', items: [{ menuItemId: 'not-a-menu-id', quantity: 1 }]
    });
    assert.equal(invalidIdResult.ok, false, 'Invalid menu IDs must be rejected.');
    const zeroQuantityResult = await emitAck(customerSocket, 'placeOrder', {
      tableNumber: '3', items: [{ menuItemId: String(menuByName.get('Cafe Latte')._id), quantity: 0 }]
    });
    assert.equal(zeroQuantityResult.ok, false, 'Zero quantities must be rejected.');
    const emptyOrderResult = await emitAck(customerSocket, 'placeOrder', { tableNumber: '3', items: [] });
    assert.equal(emptyOrderResult.ok, false, 'Empty orders must be rejected.');
    assert.equal(await Order.countDocuments({}), 1, 'Rejected order payloads must not be saved.');

    const readyEvent = waitForSocketEvent(customerSocket, 'orderStatusChanged', (order) => order.orderId === orderId && order.orderStatus === 'Ready');
    const preparing = await emitAck(adminSocket, 'updateOrderStatus', { orderId, status: 'Preparing' });
    assert.equal(preparing.ok, true, preparing.error);
    const ready = await emitAck(adminSocket, 'updateOrderStatus', { orderId, status: 'Ready' });
    assert.equal(ready.ok, true, ready.error);
    const readyPayload = await readyEvent;
    assert.equal(readyPayload.orderStatus, 'Ready');
    assert.equal((await Order.findOne({ orderId })).orderStatus, 'Ready');
    console.log('Kitchen: order moved Received → Preparing → Ready; customer received live status.');

    const completed = await emitAck(adminSocket, 'updateOrderStatus', { orderId, status: 'Completed' });
    assert.equal(completed.ok, true, completed.error);
    const billResponse = await request(baseUrl).post('/api/billing/generate').set(adminHeaders).send({ orderId, paymentMode: 'UPI' }).expect(201);
    billId = billResponse.body.bill.billId;
    assert.equal(billResponse.body.bill.subtotal, 12.75);
    assert.equal(billResponse.body.bill.tax, 0.64);
    assert.equal(billResponse.body.bill.finalTotal, 13.39);
    assert.equal((await Order.findOne({ orderId })).paymentStatus, 'Paid');
    const summary = await request(baseUrl).get('/api/billing/summary').set(adminHeaders).expect(200);
    assert.equal(summary.body.totalRevenue, 13.39);
    assert.equal(summary.body.totalOrdersProcessed, 1);
    assert.equal(summary.body.daily.revenue, 13.39);
    assert.equal(summary.body.daily.orderCount, 1);
    assert.equal(summary.body.paymentModeBreakdown.find((row) => row.paymentMode === 'UPI').revenue, 13.39);
    const receipt = await request(baseUrl).get(`/api/billing/receipt/${billId}`).set(adminHeaders).expect(200);
    assert.equal(receipt.body.receipt.orderId, orderId);
    console.log(`Billing: order billed at ₹13.39 (subtotal ₹12.75 + tax ₹0.64); payment is Paid.`);

    const pendingConfessionEvent = waitForSocketEvent(adminSocket, 'newPendingConfession');
    const confession = await request(baseUrl).post('/api/confessions').send({ messageText: 'E2E confession: the cinnamon latte made my morning.' }).expect(201);
    confessionId = confession.body.confession._id;
    assert.equal(confession.body.confession.isApproved, false);
    await pendingConfessionEvent;
    const publicBeforeApproval = await request(baseUrl).get('/api/confessions').expect(200);
    assert.equal(publicBeforeApproval.body.confessions.some((entry) => entry._id === confessionId), false);

    const approvalBroadcast = waitForSocketEvent(customerSocket, 'newApprovedConfession', (entry) => entry._id === confessionId);
    await request(baseUrl).patch(`/api/confessions/${confessionId}/approve`).set(adminHeaders).expect(200);
    const liveConfession = await approvalBroadcast;
    assert.equal(liveConfession.isApproved, true);
    const publicAfterApproval = await request(baseUrl).get('/api/confessions').expect(200);
    assert.equal(publicAfterApproval.body.confessions.some((entry) => entry._id === confessionId), true);
    console.log('Community: confession stayed pending until approval, then appeared on the live wall.');

    await request(baseUrl).get('/api/orders').expect(401);
    await request(baseUrl).get('/api/billing/summary').expect(401);
    await request(baseUrl).get('/api/confessions/pending').expect(401);
    await request(baseUrl).patch(`/api/confessions/${confessionId}/approve`).expect(401);
    await request(baseUrl).post('/api/menu').send({ name: 'Unauthorized item' }).expect(401);
    console.log('Boundaries: invalid order payloads were rejected and protected endpoints returned 401.');

    console.log('\nE2E PASS: Modules 1–5 completed the full café order lifecycle.');
    console.log(`Test records are available in the isolated database: ${new URL(TEST_URI).pathname.replace(/^\//, '')}`);
  } finally {
    adminSocket?.disconnect();
    customerSocket?.disconnect();
    await new Promise((resolve) => io.close(resolve));
    await require('mongoose').disconnect();
  }
}

run().catch((error) => {
  console.error('\nE2E FAIL:', error.stack || error.message);
  process.exitCode = 1;
});
