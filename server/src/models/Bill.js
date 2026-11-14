const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  billId: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
  orderId: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
  subtotal: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, required: true, min: 0, max: 1, default: 0.05 },
  tax: { type: Number, required: true, min: 0, default: 0 },
  discount: { type: Number, required: true, min: 0, default: 0 },
  finalTotal: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, required: true, trim: true, maxlength: 50 },
  timestamp: { type: Date, default: Date.now, immutable: true }
}, { versionKey: false });

module.exports = mongoose.models.Bill || mongoose.model('Bill', billSchema);
