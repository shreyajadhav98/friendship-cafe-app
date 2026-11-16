#!/usr/bin/env node
'use strict';

const mongoose = require('mongoose');
const Menu = require('../src/models/Menu');
const dotenv = require('dotenv');
dotenv.config();

// Curated transliterations and natural category labels for the café's existing 82-item catalog.
// Brand and flavor names are preserved phonetically so guests can recognize the menu item.
const translations = {
  'Veg Cheese Pizza': ['वेज़ चीज़ पिज़्ज़ा', 'व्हेज चीज पिझ्झा'],
  'Veg Corn Pizza': ['वेज़ कॉर्न पिज़्ज़ा', 'व्हेज कॉर्न पिझ्झा'],
  'Margherita Pizza': ['मार्गरीटा पिज़्ज़ा', 'मार्गेरिटा पिझ्झा'],
  'Veg Cheese Burst Pizza': ['वेज़ चीज़ बर्स्ट पिज़्ज़ा', 'व्हेज चीज बर्स्ट पिझ्झा'],
  'Paneer Tikka Pizza': ['पनीर टिक्का पिज़्ज़ा', 'पनीर टिक्का पिझ्झा'],
  'Veg Tandoori Paneer Pizza': ['वेज़ तंदूरी पनीर पिज़्ज़ा', 'व्हेज तंदुरी पनीर पिझ्झा'],
  'All-Veggie Cheese Pizza': ['मिक्स वेज चीज़ पिज़्ज़ा', 'मिक्स व्हेज चीज पिझ्झा'],
  'Masala Toast': ['मसाला टोस्ट', 'मसाला टोस्ट'],
  'Masala Cheese Toast': ['मसाला चीज़ टोस्ट', 'मसाला चीज टोस्ट'],
  'Veg Crunchy Grilled Sandwich': ['क्रंची वेज ग्रिल्ड सैंडविच', 'क्रंची व्हेज ग्रिल्ड सँडविच'],
  'Cheese Grilled Sandwich': ['चीज़ ग्रिल्ड सैंडविच', 'चीज ग्रिल्ड सँडविच'],
  'Cheese Chilli Sandwich': ['चीज़ चिली सैंडविच', 'चीज चिली सँडविच'],
  'Chocolate Grilled Sandwich': ['चॉकलेट ग्रिल्ड सैंडविच', 'चॉकलेट ग्रिल्ड सँडविच'],
  'Paneer Tikka Sandwich': ['पनीर टिक्का सैंडविच', 'पनीर टिक्का सँडविच'],
  'Tandoori Paneer Sandwich': ['तंदूरी पनीर सैंडविच', 'तंदुरी पनीर सँडविच'],
  'Corn Sandwich': ['कॉर्न सैंडविच', 'कॉर्न सँडविच'],
  'All-Veggie Sandwich': ['मिक्स वेज सैंडविच', 'मिक्स व्हेज सँडविच'],
  'Triple Cheese Sandwich': ['ट्रिपल चीज़ सैंडविच', 'ट्रिपल चीज सँडविच'],
  'Spicy Veg Burger': ['स्पाइसी वेज बर्गर', 'झणझणीत व्हेज बर्गर'],
  'Simple Veg Burger': ['सादा वेज बर्गर', 'साधा व्हेज बर्गर'],
  'Aloo Tikki Burger': ['आलू टिक्की बर्गर', 'बटाटा टिक्की बर्गर'],
  'Veg Cheese Burger': ['वेज़ चीज़ बर्गर', 'व्हेज चीज बर्गर'],
  'Veg Corn Burger': ['वेज़ कॉर्न बर्गर', 'व्हेज कॉर्न बर्गर'],
  'Veg Grilled Cheese Burger': ['वेज़ ग्रिल्ड चीज़ बर्गर', 'व्हेज ग्रिल्ड चीज बर्गर'],
  'Paneer Tikka Burger': ['पनीर टिक्का बर्गर', 'पनीर टिक्का बर्गर'],
  'Maharaja Burger': ['महाराजा बर्गर', 'महाराजा बर्गर'],
  'French Fries': ['फ्रेंच फ्राइज़', 'फ्रेंच फ्राइज'],
  'Periperi Fries': ['पेरी-पेरी फ्राइज़', 'पेरी-पेरी फ्राइज'],
  'Masala Fries': ['मसाला फ्राइज़', 'मसाला फ्राइज'],
  'Catpata Fries': ['चटपटी फ्राइज़', 'चटपटी फ्राइज'],
  'Masala Mayo Fries': ['मसाला मेयो फ्राइज़', 'मसाला मेयो फ्राइज'],
  'Masala Cheese Fries': ['मसाला चीज़ फ्राइज़', 'मसाला चीज फ्राइज'],
  'Loaded Fries': ['लोडेड फ्राइज़', 'लोडेड फ्राइज'],
  'Tandoor Nuggets': ['तंदूरी नगेट्स', 'तंदुरी नगेट्स'],
  'Potato Pops': ['पोटैटो पॉप्स', 'बटाटा पॉप्स'],
  'Cheese Corn Nuggets': ['चीज़ कॉर्न नगेट्स', 'चीज कॉर्न नगेट्स'],
  'Wedge Fingers': ['वेज फिंगर्स', 'वेज फिंगर्स'],
  'Plain Milkshake': ['क्लासिक मिल्कशेक', 'क्लासिक मिल्कशेक'],
  'Mango Shake': ['मैंगो शेक', 'आंब्याचा शेक'],
  'Strawberry Shake': ['स्ट्रॉबेरी शेक', 'स्ट्रॉबेरी शेक'],
  'Rose Shake': ['रोज़ शेक', 'गुलाबाचा शेक'],
  'Chocolate Shake': ['चॉकलेट शेक', 'चॉकलेट शेक'],
  'Apple Shake': ['एप्पल शेक', 'सफरचंदाचा शेक'],
  'Oreo Shake': ['ओरियो शेक', 'ओरियो शेक'],
  'Kitkat Shake': ['किटकैट शेक', 'किटकॅट शेक'],
  'Mixed Dry Fruit Shake': ['मिक्स ड्राई फ्रूट शेक', 'मिक्स ड्रायफ्रूट शेक'],
  'Vanilla': ['वनीला', 'व्हॅनिला'],
  'Strawberry': ['स्ट्रॉबेरी', 'स्ट्रॉबेरी'],
  'Alphonso Mango': ['अल्फांसो आम', 'हापूस आंबा'],
  'Butterscotch': ['बटरस्कॉच', 'बटरस्कॉच'],
  'Cashew Gulkand': ['काजू गुलकंद', 'काजू गुलकंद'],
  'Choco Chips': ['चोको चिप्स', 'चोको चिप्स'],
  'Dry Fruit Special': ['स्पेशल ड्राई फ्रूट', 'स्पेशल ड्रायफ्रूट'],
  'Triple Mix Scoop (3 Flavors)': ['ट्रिपल मिक्स स्कूप (3 फ्लेवर)', 'ट्रिपल मिक्स स्कूप (3 फ्लेवर्स)'],
  'Plain Lassi': ['सादी लस्सी', 'साधी लस्सी'],
  'Mango Lassi': ['मैंगो लस्सी', 'आंब्याची लस्सी'],
  'Rose Lassi': ['रोज़ लस्सी', 'गुलाबाची लस्सी'],
  'Dryfruits Lassi': ['ड्राई फ्रूट लस्सी', 'ड्रायफ्रूट लस्सी'],
  'Vanilla Mastani': ['वनीला मस्तानी', 'व्हॅनिला मस्तानी'],
  'Strawberry Mastani': ['स्ट्रॉबेरी मस्तानी', 'स्ट्रॉबेरी मस्तानी'],
  'Rose Mastani': ['रोज़ मस्तानी', 'गुलाब मस्तानी'],
  'Mango Mastani': ['मैंगो मस्तानी', 'आंबा मस्तानी'],
  'Butterscotch Mastani': ['बटरस्कॉच मस्तानी', 'बटरस्कॉच मस्तानी'],
  'Chocolate Mastani': ['चॉकलेट मस्तानी', 'चॉकलेट मस्तानी'],
  'Oreo Mastani': ['ओरियो मस्तानी', 'ओरियो मस्तानी'],
  'KitKit Mastani': ['किटकैट मस्तानी', 'किटकॅट मस्तानी'],
  'Dry Fruit Mastani': ['ड्राई फ्रूट मस्तानी', 'ड्रायफ्रूट मस्तानी'],
  'Special Falooda': ['स्पेशल फालूदा', 'स्पेशल फालुदा'],
  'Fruit Salad': ['फ्रूट सलाद', 'फ्रूट सॅलड'],
  'Regular Cocktail': ['रेग्युलर कॉकटेल', 'रेग्युलर कॉकटेल'],
  'Special Dry Fruit Cocktail': ['स्पेशल ड्राई फ्रूट कॉकटेल', 'स्पेशल ड्रायफ्रूट कॉकटेल'],
  'Titanic Special': ['टाइटैनिक स्पेशल', 'टायटॅनिक स्पेशल'],
  'Hot Coffee': ['गरम कॉफी', 'गरम कॉफी'],
  'Hot Chocolate': ['हॉट चॉकलेट', 'हॉट चॉकलेट'],
  'Cold Coffee': ['कोल्ड कॉफी', 'कोल्ड कॉफी'],
  'Cold Chocolate Coffee': ['कोल्ड चॉकलेट कॉफी', 'कोल्ड चॉकलेट कॉफी'],
  'Cold Coffee with Ice Cream': ['आइसक्रीम वाली कोल्ड कॉफी', 'आईस्क्रीमसह कोल्ड कॉफी'],
  'Chocolate Cad-B': ['चॉकलेट कैड-बी', 'चॉकलेट कॅड-बी'],
  'Vanilla Cad-B': ['वनीला कैड-बी', 'व्हॅनिला कॅड-बी'],
  'Vanilla-Chocolate Mix Cad-B': ['वनीला-चॉकलेट मिक्स कैड-बी', 'व्हॅनिला-चॉकलेट मिक्स कॅड-बी'],
  'Oreo Cad-B - 90': ['ओरियो कैड-बी - 90', 'ओरियो कॅड-बी - 90'],
  'Tea': ['चाय', 'चहा']
};

const categories = {
  'Pizza': ['पिज़्ज़ा', 'पिझ्झा'], 'Grill Sandwich': ['ग्रिल्ड सैंडविच', 'ग्रिल्ड सँडविच'],
  'Burger': ['बर्गर', 'बर्गर'], 'Fries': ['फ्राइज़', 'फ्राइज'], 'Nuggets': ['नगेट्स', 'नगेट्स'],
  'Thick Milkshake': ['थिक मिल्कशेक', 'थिक मिल्कशेक'], 'Ice cream Scoop': ['आइसक्रीम स्कूप', 'आईस्क्रीम स्कूप'],
  'Lassi': ['लस्सी', 'लस्सी'], 'Mastani Special': ['मस्तानी स्पेशल', 'मस्तानी स्पेशल'],
  'Cocktails': ['फालूदा और फ्रूट ड्रिंक्स', 'फालुदा आणि फ्रूट ड्रिंक्स'],
  'Coffee Special': ['कॉफी स्पेशल', 'कॉफी स्पेशल'], 'Tea': ['चाय', 'चहा'],
  'Beverages': ['पेय पदार्थ', 'पेय'], 'Snacks': ['स्नैक्स', 'स्नॅक्स'], 'Fast Food': ['फास्ट फूड', 'फास्ट फूड'], 'Desserts': ['मिठाइयाँ', 'मिष्टान्न']
};

async function migrate() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. Set it in the deployment environment or server/.env.');
  await mongoose.connect(process.env.MONGODB_URI);
  const items = await Menu.find({}).select('name category description name_hi name_mr category_hi category_mr description_hi description_mr').lean();
  const unknownItems = items.filter((item) => !translations[item.name]);
  const unknownCategories = [...new Set(items.map((item) => item.category).filter((category) => !categories[category]))];
  if (unknownItems.length || unknownCategories.length) {
    const names = unknownItems.map((item) => item.name).join(', ');
    throw new Error(`Translation catalog is incomplete. Unmapped menu names: ${names || 'none'}; categories: ${unknownCategories.join(', ') || 'none'}`);
  }
  let updated = 0;
  for (const item of items) {
    const [name_hi, name_mr] = translations[item.name];
    const [category_hi, category_mr] = categories[item.category];
    const fields = {
      name_hi: item.name_hi || name_hi,
      name_mr: item.name_mr || name_mr,
      category_hi: item.category_hi || category_hi,
      category_mr: item.category_mr || category_mr,
      description_hi: item.description_hi || '',
      description_mr: item.description_mr || ''
    };
    const result = await Menu.updateOne({ _id: item._id }, { $set: fields });
    updated += result.modifiedCount;
  }
  const incomplete = await Menu.countDocuments({ $or: [{ name_hi: '' }, { name_mr: '' }, { category_hi: '' }, { category_mr: '' }] });
  if (incomplete) throw new Error(`${incomplete} menu records remain without localized names or categories`);
  console.log(`Localized ${items.length} menu items (${updated} modified); prices and availability were not changed.`);
}

if (require.main === module) migrate().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

module.exports = { translations, categories, migrate };
