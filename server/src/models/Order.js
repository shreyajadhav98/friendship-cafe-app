const mongoose = require('mongoose');
const shortid = require('shortid');
const crypto = require('crypto');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
  quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  customNotes: { type: String, default: '', trim: true, maxlength: 1000 },
  itemName: { type: String, default: '', trim: true, maxlength: 120 },
  itemName_hi: { type: String, default: '', trim: true, maxlength: 120 },
  itemName_mr: { type: String, default: '', trim: true, maxlength: 120 },
  unitPrice: { type: Number, default: 0, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, default: () => shortid.generate() },
  trackingToken: { type: String, required: true, default: () => crypto.randomBytes(32).toString('hex'), select: false },
  customerName: { type: String, required: true, trim: true, maxlength: 120 },
  customerPhone: { type: String, default: '', trim: true, maxlength: 10, match: /^(?:[6-9]\d{9})?$/ },
  tableNumber: { type: String, required: true, trim: true, maxlength: 30 },
  items: { type: [orderItemSchema], required: true, validate: { validator: (items) => items.length > 0, message: 'An order must contain at least one item' } },
  totalAmount: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending', required: true },
  orderStatus: { type: String, enum: ['Received', 'Preparing', 'Ready', 'Completed', 'Cancelled'], default: 'Received', required: true },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, immutable: true },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
