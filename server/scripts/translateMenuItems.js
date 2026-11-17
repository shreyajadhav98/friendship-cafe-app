#!/usr/bin/env node
'use strict';

const mongoose = require('mongoose');
const Menu = require('../src/models/Menu');
const dotenv = require('dotenv');
const { translations, categories, menuEntries, translateMenuFields } = require('../src/utils/menuTranslator');
dotenv.config();

async function migrate() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. Configure the MongoDB Atlas connection string in the deployment environment or server/.env.');
  await mongoose.connect(process.env.MONGODB_URI);
  const items = await Menu.find({}).select('name category price name_hi name_mr category_hi category_mr').lean();
  if (items.length !== 82) console.warn(`Expected the current 82-item catalog; found ${items.length}. Known items will use owner-approved translations and new items will use the translator fallback.`);

  let updated = 0;
  const untranslated = [];
  for (const item of items) {
    const translated = translateMenuFields(item, { force: true });
    if (!translated.name_hi || !translated.name_mr || !translated.category_hi || !translated.category_mr) untranslated.push(item.name);
    const fields = {
      name_hi: translated.name_hi,
      name_mr: translated.name_mr,
      category_hi: translated.category_hi,
      category_mr: translated.category_mr
    };
    const result = await Menu.updateOne({ _id: item._id, $or: Object.entries(fields).map(([field, value]) => ({ [field]: { $ne: value } })) }, { $set: fields }, { timestamps: false });
    updated += result.modifiedCount;
  }
  if (untranslated.length) throw new Error(`Could not translate these menu entries: ${untranslated.join(', ')}`);
  console.log(`Applied owner-approved translations to ${items.length} menu items (${updated} modified); prices and availability were not changed.`);
}

if (require.main === module) migrate().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

module.exports = { translations, categories, menuEntries, migrate };
