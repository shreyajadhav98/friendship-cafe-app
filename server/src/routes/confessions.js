const express = require('express');
const mongoose = require('mongoose');
const { Confession } = require('../models');
const { authenticate } = require('../middleware/authenticate');
const { ADMIN_ROOM } = require('../sockets/orders');

const router = express.Router();
const MAX_MESSAGE_LENGTH = 500;

router.get('/', async (req, res, next) => {
  try {
    const confessions = await Confession.find({ isApproved: true }).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ confessions });
  } catch (error) { return next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const messageText = typeof req.body?.messageText === 'string' ? req.body.messageText.trim() : '';
    if (!messageText) return res.status(400).json({ error: 'A confession message is required' });
    if (messageText.length > MAX_MESSAGE_LENGTH) return res.status(400).json({ error: `Confession must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
    const confession = await Confession.create({ messageText, isApproved: false });
    req.app.get('io')?.to(ADMIN_ROOM).emit('newPendingConfession', confession.toObject());
    return res.status(201).json({ confession });
  } catch (error) { return next(error); }
});

router.patch('/:id/like', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid confession id' });
    const confession = await Confession.findOneAndUpdate({ _id: req.params.id, isApproved: true }, { $inc: { likesCount: 1 } }, { new: true });
    if (!confession) return res.status(404).json({ error: 'Approved confession not found' });
    return res.json({ confession });
  } catch (error) { return next(error); }
});

router.get('/pending', authenticate, async (req, res, next) => {
  try {
    const confessions = await Confession.find({ isApproved: false }).sort({ createdAt: 1 }).limit(200).lean();
    return res.json({ confessions });
  } catch (error) { return next(error); }
});

router.patch('/:id/approve', authenticate, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid confession id' });
    const confession = await Confession.findOneAndUpdate({ _id: req.params.id, isApproved: false }, { $set: { isApproved: true } }, { new: true });
    if (!confession) return res.status(404).json({ error: 'Pending confession not found' });
    const io = req.app.get('io');
    if (io) io.emit('newApprovedConfession', confession.toObject());
    return res.json({ confession });
  } catch (error) { return next(error); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid confession id' });
    const confession = await Confession.findByIdAndDelete(req.params.id);
    if (!confession) return res.status(404).json({ error: 'Confession not found' });
    return res.json({ message: 'Confession deleted', id: confession.id });
  } catch (error) { return next(error); }
});

module.exports = router;
