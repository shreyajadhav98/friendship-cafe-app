const express = require('express');
const mongoose = require('mongoose');
const { Order } = require('../models');
const { authenticate } = require('../middleware/authenticate');
const { publicOrder, orderRoom, ADMIN_ROOM } = require('../sockets/orders');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const completeLimiter = createRateLimiter({ windowMs: 60_000, max: 30, message: 'Too many order updates. Please wait before trying again.' });

router.get('/', authenticate, async (req, res, next) => {
  try {
    if (req.query.active !== undefined && !['true', 'false'].includes(req.query.active)) return res.status(400).json({ error: 'active must be true or false' });
    const orderStatus = req.query.active === 'true' ? { $nin: ['Cancelled', 'Completed'] } : { $ne: 'Cancelled' };
    const orders = await Order.find({ orderStatus })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('items.menuItemId', 'name name_hi name_mr price')
      .lean();
    return res.json({ orders: orders.map(publicOrder) });
  } catch (error) { return next(error); }
});

router.patch('/:id/complete', authenticate, completeLimiter, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid order id' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.orderStatus === 'Completed') return res.json({ order: publicOrder(order), alreadyCompleted: true });
    if (order.orderStatus !== 'Ready') return res.status(409).json({ error: 'Only Ready orders can be completed from the kitchen board' });

    order.orderStatus = 'Completed';
    order.completedAt = new Date();
    order.updatedAt = order.completedAt;
    await order.save();
    await order.populate('items.menuItemId', 'name name_hi name_mr price');
    const payload = publicOrder(order);
    const io = req.app.get('io');
    if (io) {
      io.to(orderRoom(order.orderId)).emit('orderStatusChanged', payload);
      io.to(ADMIN_ROOM).emit('orderStatusUpdated', payload);
    }
    return res.json({ order: payload, alreadyCompleted: false });
  } catch (error) { return next(error); }
});

module.exports = router;
