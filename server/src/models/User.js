const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 80 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff', required: true },
  createdAt: { type: Date, default: Date.now, immutable: true }
}, { versionKey: false });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
