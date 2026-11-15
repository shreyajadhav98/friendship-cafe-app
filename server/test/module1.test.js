const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { io: connectSocket } = require('socket.io-client');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { connectDatabase } = require('../src/db/connect');
const { User, Menu, Order, Confession, Bill, EventBooking } = require('../src/models');
const { authenticate } = require('../src/middleware/authenticate');
const { createHttpServer } = require('../src/server');
const { generateQrCodes } = require('../scripts/generate-table-qrs');

const uri = process.env.TEST_MONGODB_URI;
if (!uri) throw new Error('TEST_MONGODB_URI is required. Use a dedicated test database before running tests.');
const app = createApp();
let admin;
let menu;
let module3CompletedOrderId;

before(async () => {
  await connectDatabase(uri);
  await Promise.all([User, Menu, Order, Confession, Bill, EventBooking].map((model) => model.deleteMany({})));
  admin = await User.create({ username: 'module1-admin', passwordHash: await bcrypt.hash('integration-password-123', 10), role: 'admin' });
  menu = await Menu.create({ name: 'Test latte', category: 'Coffee', description: 'Integration fixture', price: 4.5, imageUrl: '', isAvailable: true, prepTimeMinutes: 5 });
});

after(async () => { await mongoose.disconnect(); });

test('health and public auth behavior', async () => {
  const health = await request(app).get('/api/health').expect(200);
  assert.equal(health.body.status, 'ok');
  await request(app).get('/api/auth/me').expect(401);
  await request(app).post('/api/auth/login').send({ username: 'module1-admin', password: 'incorrect-password' }).expect(401);
});

test('admin login returns a JWT and /me is protected', async () => {
  const login = await request(app).post('/api/auth/login').send({ username: 'module1-admin', password: 'integration-password-123' }).expect(200);
  assert.equal(typeof login.body.token, 'string');
  assert.equal(login.body.user.role, 'admin');
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`).expect(200);
  assert.equal(me.body.user.username, 'module1-admin');
  await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid').expect(401);
});

test('all five Mongoose models create and fetch database records', async () => {
  const fetchedMenu = await Menu.findById(menu._id);
  assert.equal(fetchedMenu.name, 'Test latte');

  const order = await Order.create({ customerName: 'Test Guest', tableNumber: 'T1', items: [{ menuItemId: menu._id, quantity: 2, customNotes: 'Oat milk' }], totalAmount: 9 });
  assert.equal((await Order.findById(order._id)).items[0].quantity, 2);

  const confession = await Confession.create({ messageText: 'Integration confession' });
  const fetchedConfession = await Confession.findById(confession._id);
  assert.equal(fetchedConfession.isApproved, false);
  assert.equal(fetchedConfession.likesCount, 0);

  const bill = await Bill.create({ billId: 'TEST-BILL-1', orderId: order.orderId, subtotal: 9, tax: 0.9, discount: 0, finalTotal: 9.9, paymentMode: 'Cash' });
  assert.equal((await Bill.findById(bill._id)).finalTotal, 9.9);

  const fetchedUser = await User.findById(admin._id).select('+passwordHash');
  assert.equal(fetchedUser.role, 'admin');
  assert.equal(await bcrypt.compare('integration-password-123', fetchedUser.passwordHash), true);
});

test('menu read is public while every write route requires the Module 1 admin token', async () => {
  const publicMenu = await request(app).get('/api/menu').expect(200);
  assert.equal(publicMenu.body.items.some((item) => item._id === menu.id), true);
  assert.equal(publicMenu.body.categories.Coffee.some((item) => item._id === menu.id), true);
  await request(app).post('/api/menu').send({ name: 'Unauthorized item' }).expect(401);
  await request(app).put(`/api/menu/${menu.id}`).send({ price: 6 }).expect(401);
  await request(app).patch(`/api/menu/${menu.id}/is-available`).send({ isAvailable: false }).expect(401);
  await request(app).delete(`/api/menu/${menu.id}`).expect(401);
  await request(app).get('/api/orders').expect(401);
  await request(app).post('/api/billing/generate').send({ orderId: 'nope', paymentMode: 'Cash' }).expect(401);
  await request(app).get('/api/billing/summary').expect(401);
  await request(app).get('/api/billing/receipt/BILL-PRIVATE').expect(401);
  assert.equal(typeof authenticate, 'function');
});

function waitForSocketEvent(socket, eventName, predicate = () => true, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(eventName, listener); reject(new Error(`Timed out waiting for ${eventName}`)); }, timeoutMs);
    const listener = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer); socket.off(eventName, listener); resolve(payload);
    };
    socket.on(eventName, listener);
  });
}

function waitForConnect(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connection timed out')), 5000);
    socket.once('connect', () => { clearTimeout(timer); resolve(); });
    socket.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
  });
}

function emitAck(socket, eventName, payload) {
  return new Promise((resolve, reject) => socket.timeout(5000).emit(eventName, payload, (error, result) => {
    if (error) return reject(error);
    if (!result?.ok) return reject(new Error(result?.error || `${eventName} failed`));
    resolve(result);
  }));
}

test('Socket.io customer order reaches kitchen, uses database pricing, and tracks Ready status', async () => {
  const { httpServer, io } = createHttpServer();
  await new Promise((resolve, reject) => { httpServer.once('error', reject); httpServer.listen(0, '127.0.0.1', resolve); });
  const address = httpServer.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const login = await request(app).post('/api/auth/login').send({ username: 'module1-admin', password: 'integration-password-123' }).expect(200);
  const adminSocket = connectSocket(baseUrl, { auth: { token: login.body.token }, transports: ['websocket'] });
  const customerSocket = connectSocket(baseUrl, { transports: ['websocket'] });
  let resumedCustomerSocket;
  let createdOrderId;
  try {
    await Promise.all([waitForConnect(adminSocket), waitForConnect(customerSocket)]);
    const kitchenOrderPromise = waitForSocketEvent(adminSocket, 'newOrderReceived');
    const placed = await emitAck(customerSocket, 'placeOrder', {
      customerName: 'Socket Test Guest', tableNumber: 'T-SOCK', total: 0.01,
      items: [{ menuItemId: menu.id, quantity: 2, customNotes: 'No sugar' }]
    });
    createdOrderId = placed.order.orderId;
    assert.equal(typeof placed.trackingToken, 'string');
    assert.equal(placed.trackingToken.length >= 48, true);
    const kitchenOrder = await kitchenOrderPromise;
    assert.equal(kitchenOrder.orderId, placed.order.orderId);
    assert.equal(placed.order.totalAmount, Number((Number(menu.price) * 2).toFixed(2)));
    assert.notEqual(placed.order.totalAmount, 0.01);
    assert.equal((await Order.findOne({ orderId: placed.order.orderId })).items[0].itemName, menu.name);
    const persistedOrders = await request(app).get('/api/orders').set({ Authorization: `Bearer ${login.body.token}` }).expect(200);
    assert.equal(persistedOrders.body.orders.some((order) => order.orderId === placed.order.orderId), true);

    resumedCustomerSocket = connectSocket(baseUrl, { transports: ['websocket'] });
    await waitForConnect(resumedCustomerSocket);
    const resumed = await emitAck(resumedCustomerSocket, 'trackOrder', { orderId: placed.order.orderId, trackingToken: placed.trackingToken });
    assert.equal(resumed.order.orderStatus, 'Received');
    const preparingEvent = waitForSocketEvent(customerSocket, 'orderStatusChanged', (order) => order.orderStatus === 'Preparing');
    const readyEvent = waitForSocketEvent(customerSocket, 'orderStatusChanged', (order) => order.orderStatus === 'Ready');
    const resumedReadyEvent = waitForSocketEvent(resumedCustomerSocket, 'orderStatusChanged', (order) => order.orderStatus === 'Ready');
    const unauthorizedUpdate = await new Promise((resolve, reject) => customerSocket.timeout(5000).emit('updateOrderStatus', { orderId: placed.order.orderId, status: 'Preparing' }, (timeoutError, result) => timeoutError ? reject(timeoutError) : resolve(result)));
    assert.equal(unauthorizedUpdate.ok, false);
    assert.match(unauthorizedUpdate.error, /Admin authentication required/);
    await emitAck(adminSocket, 'updateOrderStatus', { orderId: placed.order.orderId, status: 'Preparing' });
    assert.equal((await preparingEvent).orderStatus, 'Preparing');
    await emitAck(adminSocket, 'updateOrderStatus', { orderId: placed.order.orderId, status: 'Ready' });
    const trackedOrder = await readyEvent;
    assert.equal((await resumedReadyEvent).orderId, placed.order.orderId);
    assert.equal(trackedOrder.orderId, placed.order.orderId);
    assert.equal(trackedOrder.orderStatus, 'Ready');
    assert.equal((await Order.findOne({ orderId: placed.order.orderId })).orderStatus, 'Ready');
    await emitAck(adminSocket, 'updateOrderStatus', { orderId: placed.order.orderId, status: 'Completed' });
    module3CompletedOrderId = placed.order.orderId;
  } finally {
    if (createdOrderId && createdOrderId !== module3CompletedOrderId) await Order.deleteOne({ orderId: createdOrderId });
    adminSocket.disconnect(); customerSocket.disconnect(); resumedCustomerSocket?.disconnect();
    await new Promise((resolve) => io.close(resolve));
  }
});

test('admin CRUD works and availability changes are visible in the public menu immediately', async () => {
  const login = await request(app).post('/api/auth/login').send({ username: 'module1-admin', password: 'integration-password-123' }).expect(200);
  const auth = { Authorization: `Bearer ${login.body.token}` };
  const created = await request(app).post('/api/menu').set(auth).send({ name: 'Test muffin', category: 'Snacks', description: 'Fresh baked', price: 3.25, prepTimeMinutes: 8 }).expect(201);
  assert.equal(created.body.item.isAvailable, true);
  const id = created.body.item._id;

  const updated = await request(app).put(`/api/menu/${id}`).set(auth).send({ price: 3.5, description: 'Warm fresh baked' }).expect(200);
  assert.equal(updated.body.item.price, 3.5);
  await request(app).patch(`/api/menu/${id}/is-available`).set(auth).send({ isAvailable: false }).expect(200);
  const afterOutOfStock = await request(app).get('/api/menu').expect(200);
  assert.equal(afterOutOfStock.body.items.find((item) => item._id === id).isAvailable, false);
  assert.equal(afterOutOfStock.body.categories.Snacks.find((item) => item._id === id).isAvailable, false);
  const availableOnly = await request(app).get('/api/menu?available=true').expect(200);
  assert.equal(availableOnly.body.items.some((item) => item._id === id), false);
  await request(app).patch(`/api/menu/${id}/is-available`).set(auth).send({ isAvailable: true }).expect(200);
  assert.equal((await request(app).get('/api/menu?available=true')).body.items.some((item) => item._id === id), true);
  await request(app).delete(`/api/menu/${id}`).set(auth).expect(200);
});

test('billing taxes the Module 3 completed order, marks it paid, and updates financial summaries', async () => {
  assert.ok(module3CompletedOrderId, 'Module 3 should leave a completed order for the billing test');
  const order = await Order.findOne({ orderId: module3CompletedOrderId });
  assert.equal(order.orderStatus, 'Completed');
  assert.equal(order.paymentStatus, 'Pending');
  const login = await request(app).post('/api/auth/login').send({ username: 'module1-admin', password: 'integration-password-123' }).expect(200);
  const auth = { Authorization: `Bearer ${login.body.token}` };
  const before = await request(app).get('/api/billing/summary').set(auth).expect(200);

  const response = await request(app).post('/api/billing/generate').set(auth).send({ orderId: module3CompletedOrderId, paymentMode: 'UPI', discount: 1 }).expect(201);
  assert.equal(response.body.bill.subtotal, 9);
  assert.equal(response.body.bill.taxRate, 0.05);
  assert.equal(response.body.bill.tax, 0.45);
  assert.equal(response.body.bill.discount, 1);
  assert.equal(response.body.bill.finalTotal, 8.45);
  assert.equal(response.body.receipt.items[0].name, menu.name);
  assert.equal(response.body.receipt.items[0].unitPrice, 4.5);
  assert.equal((await Order.findOne({ orderId: module3CompletedOrderId })).paymentStatus, 'Paid');

  const receipt = await request(app).get(`/api/billing/receipt/${response.body.bill.billId}`).set(auth).expect(200);
  assert.equal(receipt.body.receipt.finalTotal, 8.45);
  assert.equal(receipt.body.receipt.paymentMode, 'UPI');
  const duplicate = await request(app).post('/api/billing/generate').set(auth).send({ orderId: module3CompletedOrderId, paymentMode: 'Cash' }).expect(200);
  assert.equal(duplicate.body.alreadyGenerated, true);
  assert.equal(duplicate.body.bill.billId, response.body.bill.billId);

  const after = await request(app).get('/api/billing/summary').set(auth).expect(200);
  assert.equal(after.body.totalRevenue, Number((before.body.totalRevenue + 8.45).toFixed(2)));
  assert.equal(after.body.totalOrdersProcessed, before.body.totalOrdersProcessed + 1);
  assert.equal(after.body.daily.revenue, Number((before.body.daily.revenue + 8.45).toFixed(2)));
  assert.equal(after.body.daily.orderCount, before.body.daily.orderCount + 1);
  assert.equal(after.body.weekly.orderCount, before.body.weekly.orderCount + 1);
  const beforeUpi = before.body.paymentModeBreakdown.find((row) => row.paymentMode === 'UPI') || { revenue: 0, orderCount: 0 };
  const afterUpi = after.body.paymentModeBreakdown.find((row) => row.paymentMode === 'UPI');
  assert.equal(afterUpi.orderCount, beforeUpi.orderCount + 1);
  assert.equal(afterUpi.revenue, Number((beforeUpi.revenue + 8.45).toFixed(2)));
  assert.equal(after.body.topSellingItems.some((item) => item.menuItemId === String(menu._id) && item.quantity >= 2), true);

  await Bill.deleteOne({ billId: response.body.bill.billId });
  await Order.deleteOne({ orderId: module3CompletedOrderId });
  module3CompletedOrderId = null;
});

test('anonymous confession stays private until approval, then broadcasts and becomes public', async () => {
  const { httpServer, io, app: liveApp } = createHttpServer();
  await new Promise((resolve, reject) => { httpServer.once('error', reject); httpServer.listen(0, '127.0.0.1', resolve); });
  const wallSocket = connectSocket(`http://127.0.0.1:${httpServer.address().port}`, { transports: ['websocket'] });
  let confessionId;
  try {
    await waitForConnect(wallSocket);
    const publicBefore = await request(liveApp).get('/api/confessions').expect(200);
    const login = await request(liveApp).post('/api/auth/login').send({ username: 'module1-admin', password: 'integration-password-123' }).expect(200);
    const auth = { Authorization: `Bearer ${login.body.token}` };
    const adminSocket = connectSocket(`http://127.0.0.1:${httpServer.address().port}`, { auth: { token: login.body.token }, transports: ['websocket'] });
    await waitForConnect(adminSocket);
    const pendingBroadcast = waitForSocketEvent(adminSocket, 'newPendingConfession');
    const submitted = await request(liveApp).post('/api/confessions').send({ messageText: 'The rain sounds better with a warm latte.' }).expect(201);
    confessionId = submitted.body.confession._id;
    assert.equal(submitted.body.confession.isApproved, false);
    assert.equal((await pendingBroadcast)._id, confessionId);
    assert.equal(publicBefore.body.confessions.some((entry) => entry._id === confessionId), false);
    const publicWhilePending = await request(liveApp).get('/api/confessions').expect(200);
    assert.equal(publicWhilePending.body.confessions.some((entry) => entry._id === confessionId), false);

    const pending = await request(liveApp).get('/api/confessions/pending').set(auth).expect(200);
    assert.equal(pending.body.confessions.some((entry) => entry._id === confessionId), true);
    await request(liveApp).patch(`/api/confessions/${confessionId}/approve`).expect(401);

    const approvalBroadcast = waitForSocketEvent(wallSocket, 'newApprovedConfession', (entry) => entry._id === confessionId);
    const approved = await request(liveApp).patch(`/api/confessions/${confessionId}/approve`).set(auth).expect(200);
    assert.equal(approved.body.confession.isApproved, true);
    assert.equal((await approvalBroadcast).messageText, 'The rain sounds better with a warm latte.');
    const visible = await request(liveApp).get('/api/confessions').expect(200);
    assert.equal(visible.body.confessions.find((entry) => entry._id === confessionId).isApproved, true);

    const liked = await request(liveApp).patch(`/api/confessions/${confessionId}/like`).expect(200);
    assert.equal(liked.body.confession.likesCount, 1);
    await request(liveApp).delete(`/api/confessions/${confessionId}`).set(auth).expect(200);
    adminSocket.disconnect();
  } finally {
    if (confessionId) await Confession.deleteOne({ _id: confessionId });
    wallSocket.disconnect();
    await new Promise((resolve) => io.close(resolve));
  }
});

test('master QR inventory requires admin auth and serves generated PNG assets', async () => {
  const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'friendship-cafe-admin-qr-'));
  const previousOutputDirectory = process.env.QR_OUTPUT_DIR;
  process.env.QR_OUTPUT_DIR = outputDirectory;
  try {
    await generateQrCodes({ domain: 'https://friendshipcafe.example', tables: ['5'], includeMaster: true, outputDirectory });
    await request(app).get('/api/admin/qr-codes').expect(401);
    const login = await request(app).post('/api/auth/login').send({ username: 'module1-admin', password: 'integration-password-123' }).expect(200);
    const inventory = await request(app).get('/api/admin/qr-codes').set({ Authorization: `Bearer ${login.body.token}` }).expect(200);
    const master = inventory.body.codes.find((code) => code.key === 'master-friendship-cafe');
    assert.ok(master);
    assert.ok(master.png.endsWith('master-friendship-cafe.png'));
    assert.ok(master.svg.endsWith('master-friendship-cafe.svg'));
    const png = await request(app).get(master.png).expect(200);
    assert.match(png.headers['content-type'], /image\/png/);
    assert.ok(png.body.length > 1000);
  } finally {
    if (previousOutputDirectory === undefined) delete process.env.QR_OUTPUT_DIR;
    else process.env.QR_OUTPUT_DIR = previousOutputDirectory;
    await fs.rm(outputDirectory, { recursive: true, force: true });
  }
});

test('event bookings validate availability, protect admin routes, and broadcast lifecycle updates', async () => {
  const { httpServer, io, app: liveApp } = createHttpServer();
  await new Promise((resolve, reject) => { httpServer.once('error', reject); httpServer.listen(0, '127.0.0.1', resolve); });
  const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
  const login = await request(liveApp).post('/api/auth/login').send({ username: 'module1-admin', password: 'integration-password-123' }).expect(200);
  const headers = { Authorization: `Bearer ${login.body.token}` };
  const adminSocket = connectSocket(baseUrl, { auth: { token: login.body.token }, transports: ['websocket'] });
  const createdIds = [];
  try {
    await waitForConnect(adminSocket);
    await request(liveApp).get('/api/events').expect(401);
    await request(liveApp).patch('/api/events/not-an-id/status').send({ status: 'Approved' }).expect(401);
    const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const bookingPayload = (overrides = {}) => ({ customerName: 'Event Guest', phone: '+919876543210', email: 'guest@example.com', eventType: 'Birthday Party', eventDate, startTime: '10:00', endTime: '12:00', guestCount: 35, bookingSpace: 'Full Cafe', cateringPreference: 'Custom Buffet', specialRequests: 'Small cake table', estimatedBudget: 25000, ...overrides });

    const newBookingEvent = waitForSocketEvent(adminSocket, 'new_event_booking');
    const birthday = await request(liveApp).post('/api/events').send(bookingPayload()).expect(201);
    createdIds.push(birthday.body.booking.bookingId);
    assert.match(birthday.body.booking.bookingId, /^EVT-[A-F0-9]{4}$/);
    assert.equal((await newBookingEvent).bookingId, birthday.body.booking.bookingId);
    await request(liveApp).patch(`/api/events/${birthday.body.booking.id}/status`).send({ status: 'Approved' }).expect(401);
    const approvedEvent = waitForSocketEvent(adminSocket, 'event_status_updated', (booking) => booking.bookingId === birthday.body.booking.bookingId && booking.status === 'Approved');
    await request(liveApp).patch(`/api/events/${birthday.body.booking.id}/status`).set(headers).send({ status: 'Approved', adminNotes: 'Private setup confirmed' }).expect(200);
    await approvedEvent;

    await request(liveApp).post('/api/events').send(bookingPayload({ eventType: 'Corporate Meeting', bookingSpace: 'Private Section', startTime: '11:00', endTime: '13:00' })).expect(409);
    const corporate = await request(liveApp).post('/api/events').send(bookingPayload({ eventType: 'Corporate Meeting', bookingSpace: 'Private Section', startTime: '13:00', endTime: '14:00' })).expect(201);
    createdIds.push(corporate.body.booking.bookingId);
    const openMic = await request(liveApp).post('/api/events').send(bookingPayload({ eventType: 'Open Mic Night', bookingSpace: 'Outdoor Patio', startTime: '14:00', endTime: '16:00' })).expect(201);
    createdIds.push(openMic.body.booking.bookingId);
    const availability = await request(liveApp).get(`/api/events/availability?date=${eventDate}`).expect(200);
    assert.equal(availability.body.slots.length, 3);
    assert.equal(availability.body.slots.some((slot) => slot.bookingSpace === 'Full Cafe' && slot.status === 'Approved'), true);
    const lookup = await request(liveApp).get(`/api/events/lookup?bookingId=${corporate.body.booking.bookingId}`).expect(200);
    assert.equal(lookup.body.bookings[0].status, 'Pending');
    assert.equal('phone' in lookup.body.bookings[0], false);

    const approvedCorporateEvent = waitForSocketEvent(adminSocket, 'event_status_updated', (booking) => booking.bookingId === corporate.body.booking.bookingId && booking.status === 'Approved');
    await request(liveApp).patch(`/api/events/${corporate.body.booking.id}/status`).set(headers).send({ status: 'Approved' }).expect(200);
    await approvedCorporateEvent;
    const completedCorporateEvent = waitForSocketEvent(adminSocket, 'event_status_updated', (booking) => booking.bookingId === corporate.body.booking.bookingId && booking.status === 'Completed');
    const completed = await request(liveApp).patch(`/api/events/${corporate.body.booking.id}/status`).set(headers).send({ status: 'Completed', adminNotes: 'Event completed successfully' }).expect(200);
    await completedCorporateEvent;
    assert.equal(completed.body.booking.status, 'Completed');
    await request(liveApp).get('/api/events?status=Pending').set(headers).expect(200);
    await request(liveApp).delete(`/api/events/${openMic.body.booking.id}`).expect(401);
  } finally {
    if (createdIds.length) await EventBooking.deleteMany({ bookingId: { $in: createdIds } });
    adminSocket.disconnect();
    await new Promise((resolve) => io.close(resolve));
  }
});
