const express = require('express');
const shortid = require('shortid');
const { Bill, Order, Menu } = require('../models');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const TAX_RATE = 0.05;
const PAYMENT_MODES = new Set(['Cash', 'UPI', 'Card']);
const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function formatReceipt(bill, order) {
  return {
    billId: bill.billId,
    orderId: bill.orderId,
    timestamp: bill.timestamp,
    customerName: order?.customerName || 'Guest',
    tableNumber: order?.tableNumber || '',
    items: (order?.items || []).map((item) => {
      const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : (item.menuItemId?.price || 0);
      return {
        name: item.itemName || item.menuItemId?.name || 'Menu item',
        quantity: item.quantity,
        unitPrice,
        lineTotal: money(unitPrice * item.quantity),
        customNotes: item.customNotes || ''
      };
    }),
    subtotal: bill.subtotal,
    taxRate: bill.taxRate ?? TAX_RATE,
    tax: bill.tax,
    discount: bill.discount,
    finalTotal: bill.finalTotal,
    paymentMode: bill.paymentMode,
    paymentStatus: 'Paid'
  };
}

router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const { orderId } = req.body || {};
    if (typeof orderId !== 'string' || !orderId.trim()) return res.status(400).json({ error: 'orderId is required' });
    const paymentMode = typeof req.body.paymentMode === 'string' ? req.body.paymentMode.trim() : '';
    if (!PAYMENT_MODES.has(paymentMode)) return res.status(400).json({ error: 'paymentMode must be Cash, UPI, or Card' });

    const order = await Order.findOne({ orderId: orderId.trim() }).populate('items.menuItemId', 'name price');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.orderStatus !== 'Completed') return res.status(409).json({ error: 'Billing is available only for completed orders' });

    const existing = await Bill.findOne({ orderId: order.orderId });
    if (existing) {
      await Order.updateOne({ _id: order._id, paymentStatus: { $ne: 'Paid' } }, { $set: { paymentStatus: 'Paid' } });
      return res.json({ bill: existing, receipt: formatReceipt(existing, order), alreadyGenerated: true });
    }
    if (order.paymentStatus === 'Paid') return res.status(409).json({ error: 'Order is already paid but has no bill record' });

    const subtotal = money(order.totalAmount);
    const rawDiscount = req.body.discount === undefined ? 0 : Number(req.body.discount);
    if (!Number.isFinite(rawDiscount) || rawDiscount < 0) return res.status(400).json({ error: 'discount must be a non-negative amount' });
    const discount = money(rawDiscount);
    if (discount > subtotal) return res.status(400).json({ error: 'discount cannot exceed the subtotal' });
    const tax = money(subtotal * TAX_RATE);
    const finalTotal = money(subtotal + tax - discount);

    let bill;
    try {
      bill = await Bill.create({
        billId: `BILL-${shortid.generate()}`,
        orderId: order.orderId,
        subtotal,
        taxRate: TAX_RATE,
        tax,
        discount,
        finalTotal,
        paymentMode
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      bill = await Bill.findOne({ orderId: order.orderId });
      if (!bill) throw error;
      await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'Paid' } });
      return res.json({ bill, receipt: formatReceipt(bill, order), alreadyGenerated: true });
    }

    const paymentUpdate = await Order.updateOne(
      { _id: order._id, orderStatus: 'Completed', paymentStatus: 'Pending' },
      { $set: { paymentStatus: 'Paid' } }
    );
    if (paymentUpdate.modifiedCount !== 1) {
      const currentOrder = await Order.findById(order._id);
      if (currentOrder?.paymentStatus !== 'Paid') {
        await Bill.deleteOne({ _id: bill._id });
        return res.status(409).json({ error: 'Order payment status changed before the bill could be finalized' });
      }
    }
    const paidOrder = await Order.findById(order._id).populate('items.menuItemId', 'name price');
    return res.status(201).json({ bill, receipt: formatReceipt(bill, paidOrder), alreadyGenerated: false });
  } catch (error) { return next(error); }
});

router.get('/receipt/:billId', authenticate, async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ billId: req.params.billId });
    if (!bill) return res.status(404).json({ error: 'Receipt not found' });
    const order = await Order.findOne({ orderId: bill.orderId }).populate('items.menuItemId', 'name price');
    return res.json({ receipt: formatReceipt(bill, order) });
  } catch (error) { return next(error); }
});

router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [allTime, daily, weekly, paymentRows, topSellingItems] = await Promise.all([
      Bill.aggregate([{ $group: { _id: null, revenue: { $sum: '$finalTotal' }, orderCount: { $sum: 1 } } }]),
      Bill.aggregate([{ $match: { timestamp: { $gte: todayStart, $lt: tomorrowStart } } }, { $group: { _id: null, revenue: { $sum: '$finalTotal' }, orderCount: { $sum: 1 } } }]),
      Bill.aggregate([{ $match: { timestamp: { $gte: weekStart, $lt: tomorrowStart } } }, { $group: { _id: null, revenue: { $sum: '$finalTotal' }, orderCount: { $sum: 1 } } }]),
      Bill.aggregate([{ $group: { _id: '$paymentMode', revenue: { $sum: '$finalTotal' }, orderCount: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Bill.aggregate([
        { $lookup: { from: Order.collection.name, localField: 'orderId', foreignField: 'orderId', as: 'order' } },
        { $unwind: '$order' },
        { $unwind: '$order.items' },
        { $group: { _id: '$order.items.menuItemId', itemName: { $first: '$order.items.itemName' }, quantity: { $sum: '$order.items.quantity' }, revenue: { $sum: { $multiply: ['$order.items.unitPrice', '$order.items.quantity'] } } } },
        { $sort: { quantity: -1, revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: Menu.collection.name, localField: '_id', foreignField: '_id', as: 'menuItem' } },
        { $project: { _id: 0, menuItemId: '$_id', name: { $ifNull: [{ $cond: [{ $ne: ['$itemName', ''] }, '$itemName', null] }, { $arrayElemAt: ['$menuItem.name', 0] }] }, quantity: 1, revenue: { $round: ['$revenue', 2] } } }
      ])
    ]);

    const total = allTime[0] || { revenue: 0, orderCount: 0 };
    const today = daily[0] || { revenue: 0, orderCount: 0 };
    const week = weekly[0] || { revenue: 0, orderCount: 0 };
    return res.json({
      timeZone: 'UTC',
      generatedAt: now,
      totalRevenue: money(total.revenue),
      totalOrdersProcessed: total.orderCount,
      daily: { date: todayStart.toISOString().slice(0, 10), revenue: money(today.revenue), orderCount: today.orderCount },
      weekly: { startDate: weekStart.toISOString().slice(0, 10), endDate: todayStart.toISOString().slice(0, 10), revenue: money(week.revenue), orderCount: week.orderCount },
      topSellingItems: topSellingItems.map((item) => ({ ...item, menuItemId: item.menuItemId ? String(item.menuItemId) : null, name: item.name || 'Removed menu item' })),
      paymentModeBreakdown: paymentRows.map((row) => ({ paymentMode: row._id, revenue: money(row.revenue), orderCount: row.orderCount }))
    });
  } catch (error) { return next(error); }
});

module.exports = router;
