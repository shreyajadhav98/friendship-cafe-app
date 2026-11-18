const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { getConfig } = require('../config/env');
const { createSocketRateLimiter } = require('../middleware/rateLimit');
const { validateIndianMobile, isPlainObject, sanitizeText, hasOnlyKeys } = require('../utils/input');
const { User, Menu, Order } = require('../models');

const ADMIN_ROOM = 'admins:kitchen';
const orderRoom = (orderId) => `order:${orderId}`;
const statusTransitions = {
  Received: ['Preparing', 'Cancelled'],
  Preparing: ['Ready', 'Cancelled'],
  Ready: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: []
};

function publicOrder(order) {
  return {
    id: String(order._id),
    orderId: order.orderId,
    customerName: order.customerName,
    tableNumber: order.tableNumber,
    items: order.items.map((item) => ({
      menuItemId: String(item.menuItemId?._id || item.menuItemId),
      name: item.itemName || item.menuItemId?.name || 'Menu item',
      name_hi: item.itemName_hi || item.menuItemId?.name_hi || '',
      name_mr: item.itemName_mr || item.menuItemId?.name_mr || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice || item.menuItemId?.price || 0,
      customNotes: item.customNotes || ''
    })),
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    completedAt: order.completedAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

function acknowledge(callback, result) {
  if (typeof callback === 'function') callback(result);
}

function initializeOrderSockets(io) {
  const limitOrderAttempts = createSocketRateLimiter({ windowMs: 60_000, max: 6 });
  const limitSocketActions = createSocketRateLimiter({ windowMs: 60_000, max: 60 });
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      const payload = jwt.verify(token, getConfig().jwtSecret, { algorithms: ['HS256'] });
      const user = await User.findById(payload.sub).select('_id username role');
      if (!user || user.role !== 'admin') return next(new Error('Admin authentication required'));
      socket.data.admin = { id: user.id, username: user.username };
      return next();
    } catch (error) {
      return next(new Error(error.name === 'TokenExpiredError' ? 'Admin token expired' : 'Invalid admin token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.data.admin) socket.join(ADMIN_ROOM);

    socket.on('trackOrder', async (payload = {}, callback) => {
      try {
        if (!limitSocketActions(socket, 'trackOrder', callback, acknowledge)) return;
        if (typeof payload.orderId !== 'string' || typeof payload.trackingToken !== 'string') {
          return acknowledge(callback, { ok: false, error: 'Order tracking credentials are required' });
        }
        const order = await Order.findOne({ orderId: payload.orderId }).select('+trackingToken');
        if (!order || order.trackingToken !== payload.trackingToken) return acknowledge(callback, { ok: false, error: 'Order tracking session is invalid' });
        await socket.join(orderRoom(order.orderId));
        return acknowledge(callback, { ok: true, order: publicOrder(order) });
      } catch (error) { return acknowledge(callback, { ok: false, error: 'Unable to resume order tracking' }); }
    });

    socket.on('placeOrder', async (payload = {}, callback) => {
      try {
        if (!limitOrderAttempts(socket, 'placeOrder', callback, acknowledge)) return;
        if (!isPlainObject(payload)) return acknowledge(callback, { ok: false, error: 'Order payload must be a JSON object' });
        const sessionToken = payload.sessionToken;
        if (typeof sessionToken !== 'string') return acknowledge(callback, { ok: false, error: 'Customer session verification is required. Refresh the page and try again.' });
        try {
          const session = jwt.verify(sessionToken, getConfig().jwtSecret, { algorithms: ['HS256'] });
          if (session.purpose !== 'customer-action') return acknowledge(callback, { ok: false, error: 'Invalid customer session token' });
        } catch (error) {
          if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return acknowledge(callback, { ok: false, error: 'Customer session expired. Refresh the page and try again.' });
          throw error;
        }
        if (!hasOnlyKeys(payload, ['sessionToken', 'tableNumber', 'customerName', 'customerPhone', 'orderingMode', 'total', 'items'])) return acknowledge(callback, { ok: false, error: 'Order payload contains unsupported fields' });
        let tableNumber;
        let customerName;
        try {
          tableNumber = sanitizeText(payload.tableNumber, { minLength: 1, maxLength: 30, field: 'Table number' });
          customerName = payload.customerName === undefined || payload.customerName === '' ? 'Guest' : sanitizeText(payload.customerName, { minLength: 1, maxLength: 120, field: 'Customer name' });
        } catch (error) { return acknowledge(callback, { ok: false, error: error.message }); }
        const customerPhone = typeof payload.customerPhone === 'string' ? payload.customerPhone.trim() : '';
        if (!validateIndianMobile(customerPhone)) return acknowledge(callback, { ok: false, error: 'Enter a valid 10-digit Indian mobile number' });
        if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 50) return acknowledge(callback, { ok: false, error: 'Order must contain between 1 and 50 items' });

        const requested = [];
        for (const line of payload.items) {
          const menuItemId = line?.menuItemId;
          const quantity = Number(line?.quantity);
          if (!isPlainObject(line) || !mongoose.isValidObjectId(menuItemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
            return acknowledge(callback, { ok: false, error: 'Each item needs a valid menuItemId and quantity from 1 to 50' });
          }
          if (line.customNotes !== undefined && typeof line.customNotes !== 'string') return acknowledge(callback, { ok: false, error: 'Item notes must be text' });
          let customNotes = '';
          try { if (line.customNotes !== undefined) customNotes = sanitizeText(line.customNotes, { maxLength: 1000, field: 'Item notes' }); }
          catch (error) { return acknowledge(callback, { ok: false, error: error.message }); }
          requested.push({ menuItemId, quantity, customNotes });
        }

        const menuItems = await Menu.find({ _id: { $in: requested.map((line) => line.menuItemId) } }).lean();
        const menuById = new Map(menuItems.map((item) => [String(item._id), item]));
        let totalCents = 0;
        const orderItems = [];
        for (const line of requested) {
          const menuItem = menuById.get(String(line.menuItemId));
          if (!menuItem) return acknowledge(callback, { ok: false, error: 'One or more menu items no longer exist' });
          if (!menuItem.isAvailable) return acknowledge(callback, { ok: false, error: `${menuItem.name} is currently out of stock` });
          const unitPriceCents = Math.round(Number(menuItem.price) * 100);
          totalCents += unitPriceCents * line.quantity;
          orderItems.push({ ...line, itemName: menuItem.name, itemName_hi: menuItem.name_hi || '', itemName_mr: menuItem.name_mr || '', unitPrice: unitPriceCents / 100 });
        }

        const order = await Order.create({ customerName, customerPhone, tableNumber, items: orderItems, totalAmount: totalCents / 100 });
        const responseOrder = publicOrder(order);
        await socket.join(orderRoom(order.orderId));
        io.to(ADMIN_ROOM).emit('newOrderReceived', responseOrder);
        return acknowledge(callback, { ok: true, order: responseOrder, trackingToken: order.trackingToken });
      } catch (error) {
        if (error.name === 'ValidationError') return acknowledge(callback, { ok: false, error: error.message });
        console.error('placeOrder socket event failed:', error);
        return acknowledge(callback, { ok: false, error: 'Unable to place order right now' });
      }
    });

    socket.on('updateOrderStatus', async (payload = {}, callback) => {
      if (!socket.data.admin) return acknowledge(callback, { ok: false, error: 'Admin authentication required' });
      try {
        if (!limitSocketActions(socket, 'updateOrderStatus', callback, acknowledge)) return;
        if (!hasOnlyKeys(payload, ['orderId', 'status'])) return acknowledge(callback, { ok: false, error: 'Status payload contains unsupported fields' });
        const { orderId, status } = payload;
        if (typeof orderId !== 'string' || typeof status !== 'string') return acknowledge(callback, { ok: false, error: 'orderId and status are required' });
        const order = await Order.findOne({ orderId });
        if (!order) return acknowledge(callback, { ok: false, error: 'Order not found' });
        if (!statusTransitions[order.orderStatus]?.includes(status)) return acknowledge(callback, { ok: false, error: `Cannot change order from ${order.orderStatus} to ${status}` });
        order.orderStatus = status;
        if (status === 'Completed' && !order.completedAt) order.completedAt = new Date();
        order.updatedAt = new Date();
        await order.save();
        const responseOrder = publicOrder(order);
        io.to(orderRoom(order.orderId)).emit('orderStatusChanged', responseOrder);
        io.to(ADMIN_ROOM).emit('orderStatusUpdated', responseOrder);
        return acknowledge(callback, { ok: true, order: responseOrder });
      } catch (error) {
        console.error('updateOrderStatus socket event failed:', error);
        return acknowledge(callback, { ok: false, error: 'Unable to update order status right now' });
      }
    });
  });
}

module.exports = { initializeOrderSockets, publicOrder, ADMIN_ROOM, orderRoom };
