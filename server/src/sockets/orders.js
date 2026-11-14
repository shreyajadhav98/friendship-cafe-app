const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { getConfig } = require('../config/env');
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
      quantity: item.quantity,
      unitPrice: item.unitPrice || item.menuItemId?.price || 0,
      customNotes: item.customNotes || ''
    })),
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

function acknowledge(callback, result) {
  if (typeof callback === 'function') callback(result);
}

function initializeOrderSockets(io) {
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
        const tableNumber = typeof payload.tableNumber === 'string' ? payload.tableNumber.trim() : '';
        const customerName = typeof payload.customerName === 'string' && payload.customerName.trim() ? payload.customerName.trim() : 'Guest';
        if (!tableNumber || tableNumber.length > 30) return acknowledge(callback, { ok: false, error: 'A valid table number is required' });
        if (customerName.length > 120) return acknowledge(callback, { ok: false, error: 'Customer name is too long' });
        if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 50) return acknowledge(callback, { ok: false, error: 'Order must contain between 1 and 50 items' });

        const requested = [];
        for (const line of payload.items) {
          const menuItemId = line?.menuItemId;
          const quantity = Number(line?.quantity);
          if (!mongoose.isValidObjectId(menuItemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            return acknowledge(callback, { ok: false, error: 'Each item needs a valid menuItemId and quantity from 1 to 99' });
          }
          const customNotes = typeof line.customNotes === 'string' ? line.customNotes.trim() : '';
          if (customNotes.length > 1000) return acknowledge(callback, { ok: false, error: 'Item notes are too long' });
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
          orderItems.push({ ...line, itemName: menuItem.name, unitPrice: unitPriceCents / 100 });
        }

        const order = await Order.create({ customerName, tableNumber, items: orderItems, totalAmount: totalCents / 100 });
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
        const { orderId, status } = payload;
        if (typeof orderId !== 'string' || typeof status !== 'string') return acknowledge(callback, { ok: false, error: 'orderId and status are required' });
        const order = await Order.findOne({ orderId });
        if (!order) return acknowledge(callback, { ok: false, error: 'Order not found' });
        if (!statusTransitions[order.orderStatus]?.includes(status)) return acknowledge(callback, { ok: false, error: `Cannot change order from ${order.orderStatus} to ${status}` });
        order.orderStatus = status;
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
