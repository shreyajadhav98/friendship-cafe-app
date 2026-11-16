const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  name_hi: { type: String, default: '', trim: true, maxlength: 120 },
  name_mr: { type: String, default: '', trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  category_hi: { type: String, default: '', trim: true, maxlength: 80 },
  category_mr: { type: String, default: '', trim: true, maxlength: 80 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  description_hi: { type: String, default: '', trim: true, maxlength: 2000 },
  description_mr: { type: String, default: '', trim: true, maxlength: 2000 },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, default: '', trim: true, maxlength: 2048 },
  isAvailable: { type: Boolean, default: true },
  prepTimeMinutes: { type: Number, required: true, min: 0, default: 0 }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.Menu || mongoose.model('Menu', menuSchema);
