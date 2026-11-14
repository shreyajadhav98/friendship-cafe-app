const express = require('express');
const { Order } = require('../models');
const { authenticate } = require('../middleware/authenticate');
const { publicOrder } = require('../sockets/orders');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const orders = await Order.find({ orderStatus: { $ne: 'Cancelled' } })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('items.menuItemId', 'name price')
      .lean();
    return res.json({ orders: orders.map(publicOrder) });
  } catch (error) { return next(error); }
});

module.exports = router;
