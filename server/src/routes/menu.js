const express = require('express');
const mongoose = require('mongoose');
const { Menu } = require('../models');
const { authenticate } = require('../middleware/authenticate');
const { sanitizeText, hasOnlyKeys } = require('../utils/input');
const { createRateLimiter } = require('../middleware/rateLimit');
const { translateMenuFields } = require('../utils/menuTranslator');

const router = express.Router();
const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 30, message: 'Too many menu changes. Please wait before trying again.' });
const writableFields = ['name', 'name_hi', 'name_mr', 'category', 'category_hi', 'category_mr', 'description', 'description_hi', 'description_mr', 'price', 'imageUrl', 'isAvailable', 'prepTimeMinutes'];
const stringLimits = { name: 120, name_hi: 120, name_mr: 120, category: 80, category_hi: 80, category_mr: 80, description: 2000, description_hi: 2000, description_mr: 2000, imageUrl: 2048 };

function pickFields(body, requireCore = false) {
  if (!hasOnlyKeys(body, [...writableFields, 'price', 'prepTimeMinutes', 'isAvailable'])) throw new TypeError('Menu payload must be an object containing supported fields only');
  const data = {};
  for (const field of writableFields) {
    if (!Object.hasOwn(body, field)) continue;
    if (!Object.hasOwn(stringLimits, field)) continue;
    data[field] = sanitizeText(body[field], { maxLength: stringLimits[field], field });
  }
  for (const field of ['price', 'prepTimeMinutes']) {
    if (!Object.hasOwn(body, field)) continue;
    if (typeof body[field] !== 'number' || !Number.isFinite(body[field]) || body[field] < 0 || field === 'prepTimeMinutes' && (!Number.isInteger(body[field]) || body[field] > 360)) throw new RangeError(`${field} must be a valid non-negative ${field === 'price' ? 'amount' : 'integer up to 360'}`);
    data[field] = body[field];
  }
  if (Object.hasOwn(body, 'isAvailable')) {
    if (typeof body.isAvailable !== 'boolean') throw new TypeError('isAvailable must be a boolean');
    data.isAvailable = body.isAvailable;
  }
  if (requireCore) for (const field of ['name', 'category', 'price']) if (data[field] === undefined) throw new TypeError(`${field} is required`);
  if (data.category && !/^[\p{L}\p{N}][\p{L}\p{N}\s&'()./-]*$/u.test(data.category)) throw new TypeError('Category contains unsupported characters');
  if (data.imageUrl && !/^https:\/\//i.test(data.imageUrl) && !/^\/(?!\/)(?!.*(?:\.\.|\\))[\w./-]*$/u.test(data.imageUrl)) throw new TypeError('imageUrl must be an HTTPS URL or a safe site path');
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

router.post('/', authenticate, writeLimiter, async (req, res, next) => {
  try {
    const data = translateMenuFields(pickFields(req.body || {}, true));
    const item = await Menu.create(data);
    return res.status(201).json({ item });
  } catch (error) { return next(error); }
});

router.put('/:id', authenticate, writeLimiter, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid menu item id' });
    const data = pickFields(req.body || {});
    if (!Object.keys(data).length) return res.status(400).json({ error: 'At least one menu field is required' });
    const existing = await Menu.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Menu item not found' });
    const merged = { ...existing.toObject(), ...data };
    const nameChanged = Object.hasOwn(data, 'name') && data.name !== existing.name;
    const categoryChanged = Object.hasOwn(data, 'category') && data.category !== existing.category;
    if (nameChanged) for (const lang of ['hi', 'mr']) if (!data[`name_${lang}`] || data[`name_${lang}`] === existing[`name_${lang}`]) merged[`name_${lang}`] = '';
    if (categoryChanged) for (const lang of ['hi', 'mr']) if (!data[`category_${lang}`] || data[`category_${lang}`] === existing[`category_${lang}`]) merged[`category_${lang}`] = '';
    const localized = translateMenuFields(merged);
    for (const lang of ['hi', 'mr']) {
      data[`name_${lang}`] = localized[`name_${lang}`];
      data[`category_${lang}`] = localized[`category_${lang}`];
    }
    const item = await Menu.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    return res.json({ item });
  } catch (error) { return next(error); }
});

router.patch('/:id/is-available', authenticate, writeLimiter, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid menu item id' });
    if (!hasOnlyKeys(req.body, ['isAvailable'])) return res.status(400).json({ error: 'Availability payload must contain isAvailable only' });
    if (typeof req.body?.isAvailable !== 'boolean') return res.status(400).json({ error: 'isAvailable must be a boolean' });
    const item = await Menu.findByIdAndUpdate(req.params.id, { $set: { isAvailable: req.body.isAvailable } }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    return res.json({ item });
  } catch (error) { return next(error); }
});

router.delete('/:id', authenticate, writeLimiter, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid menu item id' });
    const item = await Menu.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    return res.json({ message: 'Menu item removed', id: item.id });
  } catch (error) { return next(error); }
});

module.exports = router;
