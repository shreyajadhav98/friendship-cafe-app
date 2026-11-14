const express = require('express');
const mongoose = require('mongoose');
const { Menu } = require('../models');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const writableFields = ['name', 'category', 'description', 'price', 'imageUrl', 'isAvailable', 'prepTimeMinutes'];

function pickFields(body) {
  const data = {};
  for (const field of writableFields) if (Object.hasOwn(body, field)) data[field] = body[field];
  return data;
}

function validId(id) { return mongoose.isValidObjectId(id); }

// Public menu, returned as a flat item list and category buckets for flexible clients.
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.available !== undefined) {
      if (!['true', 'false'].includes(req.query.available)) return res.status(400).json({ error: 'available must be true or false' });
      filter.isAvailable = req.query.available === 'true';
    }
    const items = await Menu.find(filter).sort({ category: 1, name: 1 }).lean();
    const categories = items.reduce((grouped, item) => {
      (grouped[item.category] ||= []).push(item);
      return grouped;
    }, {});
    return res.json({ items, categories });
  } catch (error) { return next(error); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = pickFields(req.body || {});
    const item = await Menu.create(data);
    return res.status(201).json({ item });
  } catch (error) { return next(error); }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid menu item id' });
    const data = pickFields(req.body || {});
    if (!Object.keys(data).length) return res.status(400).json({ error: 'At least one menu field is required' });
    const item = await Menu.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    return res.json({ item });
  } catch (error) { return next(error); }
});

router.patch('/:id/is-available', authenticate, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid menu item id' });
    if (typeof req.body?.isAvailable !== 'boolean') return res.status(400).json({ error: 'isAvailable must be a boolean' });
    const item = await Menu.findByIdAndUpdate(req.params.id, { $set: { isAvailable: req.body.isAvailable } }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    return res.json({ item });
  } catch (error) { return next(error); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid menu item id' });
    const item = await Menu.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    return res.json({ message: 'Menu item removed', id: item.id });
  } catch (error) { return next(error); }
});

module.exports = router;
