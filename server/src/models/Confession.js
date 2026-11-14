const mongoose = require('mongoose');

const confessionSchema = new mongoose.Schema({
  messageText: { type: String, required: true, trim: true, maxlength: 5000 },
  likesCount: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, immutable: true }
}, { versionKey: false });

module.exports = mongoose.models.Confession || mongoose.model('Confession', confessionSchema);
