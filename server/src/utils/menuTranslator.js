'use strict';

const menuEntries = [
  ['Thick Milkshake','Plain Milkshake',70,'प्लेन मिल्क शेक','प्लेन मिल्क शेक',['Plain Milk Shake']],
  ['Thick Milkshake','Mango Shake',80,'मैंगो शेक','मँगो शेक'],
  ['Thick Milkshake','Strawberry Shake',80,'स्ट्रॉबेरी शेक','स्ट्रॉबेरी शेक'],
  ['Thick Milkshake','Rose Shake',80,'रोज़ शेक','रोज शेक'],
  ['Thick Milkshake','Chocolate Shake',80,'चॉकलेट शेक','चॉकलेट शेक'],
  ['Thick Milkshake','Apple Shake',90,'एप्पल शेक','अॅपल शेक'],
  ['Thick Milkshake','Oreo Shake',100,'ओरियो शेक','ओरिओ शेक'],
  ['Thick Milkshake','Kitkat Shake',100,'किटकैट शेक','किटकॅट शेक',['KitKat Shake']],
  ['Thick Milkshake','Mixed Dry Fruit Shake',120,'ऑल ड्राई फ्रूट्स शेक','ऑल ड्रायफ्रूटस शेक',['All Dryfruits Shake','All Dry Fruits Shake','Mixed Dryfruits Shake']],
  ['Ice cream Scoop','Vanilla',50,'वनीला','व्हॅनिला'],
  ['Ice cream Scoop','Strawberry',50,'स्ट्रॉबेरी','स्ट्रॉबेरी'],
  ['Ice cream Scoop','Alphonso Mango',50,'मैंगो अल्फांसो','मँगो अल्फनसो',['Mango Alphonso']],
  ['Ice cream Scoop','Butterscotch',50,'बटरस्कॉच','बटरस्कॉच'],
  ['Ice cream Scoop','Cashew Gulkand',50,'काजू गुलकंद','काजू गुलकंद',['Kaju Gulkand']],
  ['Ice cream Scoop','Choco Chips',50,'चोको चिप्स','चोको चिप्स'],
  ['Ice cream Scoop','Dry Fruit Special',80,'ड्राई फ्रूट स्पेशल','ड्रायफ्रुट स्पेशल',['Dryfruit Special']],
  ['Ice cream Scoop','Triple Mix Scoop (3 Flavors)',99,'ट्रिपल मिक्स स्कूप (3 फ्लेवर)','ट्रिपल मिक्स स्कूप (3 फ्लेवर)',['Triple Mix Scoop (3 Flavour)','Triple Mix Scoop (3 Flavors)']],
  ['Lassi','Plain Lassi',50,'प्लेन लस्सी','प्लेन लस्सी'],
  ['Lassi','Mango Lassi',60,'मैंगो लस्सी','मँगो लस्सी'],
  ['Lassi','Rose Lassi',60,'रोज़ लस्सी','रोज लस्सी'],
  ['Lassi','Dryfruits Lassi',70,'ड्राई फ्रूट्स लस्सी','ड्रायफ्रुटस् लस्सी',['Dry Fruits Lassi','Dryfruits Lassi']],
  ['Mastani Special','Vanilla Mastani',120,'वनीला मस्तानी','व्हॅनिला मस्तानी'],
  ['Mastani Special','Strawberry Mastani',140,'स्ट्रॉबेरी मस्तानी','स्ट्रॉबेरी मस्तानी'],
  ['Mastani Special','Rose Mastani',140,'रोज़ मस्तानी','रोज मस्तानी'],
  ['Mastani Special','Mango Mastani',140,'मैंगो मस्तानी','मँगो मस्तानी'],
  ['Mastani Special','Butterscotch Mastani',140,'बटरस्कॉच मस्तानी','बटरस्कॉच मस्तानी'],
  ['Mastani Special','Chocolate Mastani',140,'चॉकलेट मस्तानी','चॉकलेट मस्तानी'],
  ['Mastani Special','Oreo Mastani',150,'ओरियो मस्तानी','ओरिओ मस्तानी'],
  ['Mastani Special','KitKit Mastani',150,'किटकैट मस्तानी','किटकॅट मस्तानी',['KitKat Mastani','Kitkat Mastani']],
  ['Mastani Special','Dry Fruit Mastani',150,'ड्राई फ्रूट्स मस्तानी','ड्रायफ्रूटस् मस्तानी',['Dryfruits Mastani','Dry Fruits Mastani']],
  ['Cocktails','Special Falooda',60,'स्पेशल फालूदा','स्पेशल फालुदा'],
  ['Cocktails','Fruit Salad',100,'फ्रूट सलाद','फ्रुट सॅलेड'],
  ['Cocktails','Regular Cocktail',120,'रेगुलर कॉकटेल','रेग्युलर कॉक्टेल'],
  ['Cocktails','Special Dry Fruit Cocktail',150,'स्पेशल ड्राई फ्रूट्स कॉकटेल','स्पे. ड्रायफ्रूटस कॉक्टेल',['Spe. Dryfruits Cocktail','Special Dry Fruits Cocktail']],
  ['Cocktails','Titanic Special',150,'टाइटैनिक स्पेशल','टायटॅनिक स्पेशल'],
  ['Coffee Special','Hot Coffee',20,'हॉट कॉफी','हॉट कॉफी'],
  ['Coffee Special','Hot Chocolate',40,'हॉट चॉकलेट','हॉट चॉकलेट'],
  ['Coffee Special','Cold Coffee',60,'कोल्ड कॉफी','कोल्ड कॉफी'],
  ['Coffee Special','Cold Chocolate Coffee',70,'कोल्ड चॉकलेट कॉफी','कोल्ड चॉकलेट कॉफी'],
  ['Coffee Special','Cold Coffee with Ice Cream',80,'कोल्ड कॉफी विद आइसक्रीम','कोल्ड कॉफी विथ आईस्क्रीम',['Cold Coffee With Ice Cream']],
  ['Coffee Special','Chocolate Cad-B',70,'चॉकलेट कैड-बी','चॉकलेट कॅड बी',['Chocolate Cad B','Chocolate Cad B / Cad-B']],
  ['Coffee Special','Vanilla Cad-B',70,'वनीला कैड-बी','व्हॅनिला कॅड बी',['Vanilla Cad B','Vanilla Cad B / Cad-B']],
  ['Coffee Special','Vanilla-Chocolate Mix Cad-B',100,'वनीला चॉकलेट मिक्स कैड-बी','व्हॅनिला चॉकलेट मिक्स कॅड बी',['Vanilla Chocolate Mix Cad B','Vanilla Chocolate Mix Cad-B','Vanilla Chocolate Mix Cad B / Cad-B']],
  ['Coffee Special','Oreo Cad-B - 90',90,'ओरियो कैड-बी','ओरिओ कॅड बी',['Oreo Cad B','Oreo Cad-B','Oreo Cad B / Cad-B']],
  ['Tea','Tea',15,'चाय','चहा',['Chai','Tea / Chai']],
  ['Pizza','Veg Cheese Pizza',100,'वेज चीज़ पिज़्ज़ा','व्हेज चीज पिझ्झा'],
  ['Pizza','Veg Corn Pizza',100,'वेज कॉर्न पिज़्ज़ा','व्हेज कॉर्न पिझ्झा'],
  ['Pizza','Margherita Pizza',120,'मार्गेरिटा पिज़्ज़ा','मार्गेरिटा पिझ्झा'],
  ['Pizza','Veg Cheese Burst Pizza',120,'वेज चीज़ बर्स्ट पिज़्ज़ा','व्हेज चिज बस्ट पिझ्झा'],
  ['Pizza','Paneer Tikka Pizza',120,'पनीर टिक्का पिज़्ज़ा','पनीर टिक्का पिझ्झा'],
  ['Pizza','Veg Tandoori Paneer Pizza',120,'वेज तंदूर पनीर पिज़्ज़ा','व्हेज तंदूर पनीर पिझ्झा',['Veg Tandoor Paneer Pizza']],
  ['Pizza','All-Veggie Cheese Pizza',150,'ऑल वेजीज़ चीज़ पिज़्ज़ा','ऑल व्हेजीस चिज पिझ्झा',['All Veggies Cheese Pizza']],
  ['Grill Sandwich','Masala Toast',50,'मसाला टोस्ट','मसाला टोस्ट'],
  ['Grill Sandwich','Masala Cheese Toast',60,'मसाला चीज़ टोस्ट','मसाला चीज टोस्ट'],
  ['Grill Sandwich','Veg Crunchy Grilled Sandwich',70,'वेज क्रंची ग्रिल सैंडविच','व्हेज क्रन्ची ग्रील सॅन्डविच',['Veg Crunchy Grill Sandwich']],
  ['Grill Sandwich','Cheese Grilled Sandwich',80,'चीज़ ग्रिल सैंडविच','चिज ग्रील सॅन्डविच',['Cheese Grill Sandwich']],
  ['Grill Sandwich','Cheese Chilli Sandwich',80,'चीज़ चिली सैंडविच','चिज चिली सॅन्डविच'],
  ['Grill Sandwich','Chocolate Grilled Sandwich',80,'चॉकलेट ग्रिल सैंडविच','चॉकलेट ग्रील सॅन्डविच',['Chocolate Grill Sandwich']],
  ['Grill Sandwich','Paneer Tikka Sandwich',80,'पनीर टिक्का सैंडविच','पनीर टिक्का सॅन्डविच'],
  ['Grill Sandwich','Tandoori Paneer Sandwich',80,'तंदूर पनीर सैंडविच','तंदूर पनीर सॅन्डविच',['Tandoor Paneer Sandwich']],
  ['Grill Sandwich','Corn Sandwich',80,'कॉर्न सैंडविच','कॉर्न सॅन्डविच'],
  ['Grill Sandwich','All-Veggie Sandwich',90,'ऑल वेजीज़ सैंडविच','ऑल व्हेजीस सॅन्डविच',['All Veggies Sandwich']],
  ['Grill Sandwich','Triple Cheese Sandwich',120,'ट्रिपल चीज़ सैंडविच','ट्रिपल चिज सॅन्डविच'],
  ['Burger','Spicy Veg Burger',50,'स्पाइसी वेज बर्गर','स्पायसी व्हेज बर्गर'],
  ['Burger','Simple Veg Burger',50,'सिंपल वेज बर्गर','सिम्पल व्हेज बर्गर'],
  ['Burger','Aloo Tikki Burger',50,'आलू टिक्की बर्गर','आलू टिक्की बर्गर'],
  ['Burger','Veg Cheese Burger',60,'वेज चीज़ बर्गर','व्हेज चिज बर्गर'],
  ['Burger','Veg Corn Burger',70,'वेज कॉर्न बर्गर','व्हेज कॉर्न बर्गर'],
  ['Burger','Veg Grilled Cheese Burger',80,'वेज ग्रिल चीज़ बर्गर','व्हेज ग्रील चिज बर्गर',['Veg Grill Cheese Burger']],
  ['Burger','Paneer Tikka Burger',110,'पनीर टिक्का बर्गर','पनीर टिक्का बर्गर'],
  ['Burger','Maharaja Burger',150,'महाराजा बर्गर','महाराजा बर्गर'],
  ['Fries','French Fries',60,'फ्रेंच फ्राइज़','फ्रेंच फ्राईज'],
  ['Fries','Peri Peri Fries',70,'पेरी-पेरी फ्राइज़','पेरीपेरी फ्राईज',['Periperi Fries']],
  ['Fries','Masala Fries',70,'मसाला फ्राइज़','मसाला फ्राईज'],
  ['Fries','Chatpata Fries',70,'चटपटा फ्राइज़','चटपटा फ्राईज',['Catpata Fries']],
  ['Fries','Masala Mayo Fries',70,'मसाला मेयो फ्राइज़','मसाला मायो फ्राईज'],
  ['Fries','Masala Cheesy Fries',80,'मसाला चीज़ी फ्राइज़','मसाला चिजी फ्राईज',['Masala Cheese Fries']],
  ['Fries','Loaded Fries',100,'लोडेड फ्राइज़','लोडेड फ्राईज'],
  ['Nuggets','Tandoor Nuggets',70,'तंदूर नगेट्स (10 पीस)','तंदूर नगेटस् (10 नग)',['Tandoor Nuggets (10 Pcs)']],
  ['Nuggets','Potato Pops',70,'पोटैटो पप्स (10 पीस)','पोटॅटो पप्स (10 नग)',['Potato Pops (10 Pcs)']],
  ['Nuggets','Cheese Corn Nuggets',80,'चीज़ कॉर्न नगेट्स (5 पीस)','चिज कॉर्न नगेटस् (5 नग)',['Cheese Corn Nuggets (5 Pcs)']],
  ['Nuggets','Veg Fingers',80,'वेज फिंगर्स (5 पीस)','व्हेज फिंगर्स (5 नग)',['Veg Fingers (5 Pcs)','Wedge Fingers']]
];

const categoryTranslations = {
  'Thick Milkshake': { hi: 'थिक मिल्क शेक', mr: 'थिक मिल्क शेक', aliases: ['Thick Milk Shake'] },
  'Ice cream Scoop': { hi: 'आइसक्रीम स्कूप', mr: 'आईस्क्रीम स्कूप', aliases: ['Ice Cream Scoop'] },
  Lassi: { hi: 'लस्सी', mr: 'लस्सी' },
  'Mastani Special': { hi: 'मस्तानी स्पेशल', mr: 'मस्तानी स्पेशल' },
  Cocktails: { hi: 'कॉकटेल्स', mr: 'कॉक्टेल्स' },
  'Coffee Special': { hi: 'कॉफी स्पेशल', mr: 'कॉफी स्पेशल' },
  Pizza: { hi: 'पिज़्ज़ा', mr: 'पिझ्झा' },
  'Grill Sandwich': { hi: 'ग्रिल सैंडविच', mr: 'ग्रील सॅन्डविच' },
  Burger: { hi: 'बर्गर', mr: 'बर्गर' },
  Fries: { hi: 'फ्राइज़', mr: 'फ्राईज' },
  Nuggets: { hi: 'नगेट्स', mr: 'नगेटस्' }
};

const normalize = (value) => String(value || '').normalize('NFKD').toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const wordTranslations = {
  veg: ['वेज', 'व्हेज'], veggie: ['वेजी', 'व्हेजीस'], cheese: ['चीज़', 'चिज'], grilled: ['ग्रिल', 'ग्रील'], grill: ['ग्रिल', 'ग्रील'], sandwich: ['सैंडविच', 'सॅन्डविच'], burger: ['बर्गर', 'बर्गर'], pizza: ['पिज़्ज़ा', 'पिझ्झा'],
  masala: ['मसाला', 'मसाला'], spicy: ['स्पाइसी', 'स्पायसी'], simple: ['सिंपल', 'सिम्पल'], aloo: ['आलू', 'आलू'], tikki: ['टिक्की', 'टिक्की'], paneer: ['पनीर', 'पनीर'], tandoori: ['तंदूरी', 'तंदुरी'], tandoor: ['तंदूर', 'तंदूर'], corn: ['कॉर्न', 'कॉर्न'], fries: ['फ्राइज़', 'फ्राईज'], french: ['फ्रेंच', 'फ्रेंच'], peri: ['पेरी', 'पेरी'], chatpata: ['चटपटा', 'चटपटा'], mayo: ['मेयो', 'मायो'], loaded: ['लोडेड', 'लोडेड'], nuggets: ['नगेट्स', 'नगेटस्'], potato: ['पोटैटो', 'पोटॅटो'], pops: ['पॉप्स', 'पप्स'], fingers: ['फिंगर्स', 'फिंगर्स'], milkshake: ['मिल्क शेक', 'मिल्क शेक'], shake: ['शेक', 'शेक'], mango: ['मैंगो', 'मँगो'], strawberry: ['स्ट्रॉबेरी', 'स्ट्रॉबेरी'], rose: ['रोज़', 'रोज'], chocolate: ['चॉकलेट', 'चॉकलेट'], apple: ['एप्पल', 'अॅपल'], oreo: ['ओरियो', 'ओरिओ'], kitkat: ['किटकैट', 'किटकॅट'], vanilla: ['वनीला', 'व्हॅनिला'], butterscotch: ['बटरस्कॉच', 'बटरस्कॉच'], dry: ['ड्राई', 'ड्राय'], fruit: ['फ्रूट', 'फ्रुट'], fruits: ['फ्रूट्स', 'फ्रूटस'], special: ['स्पेशल', 'स्पेशल'], lassi: ['लस्सी', 'लस्सी'], mastani: ['मस्तानी', 'मस्तानी'], falooda: ['फालूदा', 'फालुदा'], salad: ['सलाद', 'सॅलेड'], cocktail: ['कॉकटेल', 'कॉक्टेल'], coffee: ['कॉफी', 'कॉफी'], hot: ['हॉट', 'हॉट'], cold: ['कोल्ड', 'कोल्ड'], with: ['विद', 'विथ'], ice: ['आइस', 'आईस'], cream: ['क्रीम', 'क्रीम'], tea: ['चाय', 'चहा'], chai: ['चाय', 'चहा'], cad: ['कैड', 'कॅड'], mix: ['मिक्स', 'मिक्स'], triple: ['ट्रिपल', 'ट्रिपल'], flavors: ['फ्लेवर', 'फ्लेवर'], flavor: ['फ्लेवर', 'फ्लेवर'], vanilla: ['वनीला', 'व्हॅनिला'], margherita: ['मार्गेरिटा', 'मार्गेरिटा']
};

function transliterateMenuName(name, language) {
  if (!['hi', 'mr'].includes(language)) return String(name || '');
  return String(name || '').split(/(\s+|[-/()])/).map((part) => {
    if (!part || /^(\s+|[-/()])$/.test(part)) return part;
    return wordTranslations[normalize(part)]?.[language === 'hi' ? 0 : 1] || phoneticDevanagari(part);
  }).join('');
}

function phoneticDevanagari(word) {
  const input = word.toLocaleLowerCase('en').replace(/[^a-z]/g, '');
  if (!input) return word;
  const groups = { kh:'ख', gh:'घ', chh:'छ', ch:'च', jh:'झ', th:'थ', dh:'ध', ph:'फ', bh:'भ', sh:'श', zh:'झ', ng:'ंग', aa:'आ', ee:'ई', oo:'ऊ', ai:'ऐ', au:'औ' };
  const consonants = { k:'क', g:'ग', c:'क', j:'ज', t:'त', d:'द', n:'न', p:'प', b:'ब', m:'म', y:'य', r:'र', l:'ल', v:'व', w:'व', s:'स', h:'ह', f:'फ', z:'ज़', q:'क', x:'क्स' };
  const vowels = { a:['अ','ा'], e:['ए','े'], i:['इ','ि'], o:['ओ','ो'], u:['उ','ु'] };
  let result = ''; let index = 0; let previousConsonant = false;
  while (index < input.length) {
    let match = Object.keys(groups).sort((a,b) => b.length-a.length).find((key) => input.startsWith(key,index));
    if (match) { result += groups[match]; index += match.length; previousConsonant = false; continue; }
    const character = input[index++];
    if (vowels[character]) { result += previousConsonant ? (vowels[character][1] === 'ि' ? 'ि' : vowels[character][1]) : vowels[character][0]; previousConsonant = false; }
    else if (consonants[character]) { if (previousConsonant) result += '्'; result += consonants[character]; previousConsonant = true; }
  }
  if (previousConsonant) result += '्';
  return result || word;
}

const menuIndex = new Map();
for (const [category, name, price, hi, mr, aliases = []] of menuEntries) {
  for (const variant of [name, ...aliases]) {
    const key = `${normalize(variant)}|${normalize(category)}`;
    const candidates = menuIndex.get(key) || [];
    candidates.push({ hi, mr, name, category, price });
    menuIndex.set(key, candidates);
  }
}
const categoryIndex = new Map();
for (const [name, value] of Object.entries(categoryTranslations)) for (const variant of [name, ...(value.aliases || [])]) categoryIndex.set(normalize(variant), value);

function getMenuTranslation(name, category, price, language) {
  if (!['hi', 'mr'].includes(language)) return String(name || '');
  const candidates = menuIndex.get(`${normalize(name)}|${normalize(category)}`) || [];
  if (candidates.length) {
    const priceMatch = candidates.find((entry) => Number.isFinite(Number(price)) && Math.abs(Math.round(Number(entry.price) * 100) - Math.round(Number(price) * 100)) <= 1);
    return (priceMatch || candidates[0])[language];
  }
  const byName = [...menuIndex.entries()].find(([key]) => key.startsWith(`${normalize(name)}|`))?.[1]?.[0];
  return byName?.[language] || transliterateMenuName(name, language);
}

function getCategoryTranslation(category, language) {
  if (!['hi', 'mr'].includes(language)) return String(category || '');
  return categoryIndex.get(normalize(category))?.[language] || transliterateMenuName(category, language);
}

function translateMenuFields(item, { force = false } = {}) {
  const output = { ...item };
  for (const language of ['hi', 'mr']) {
    const nameField = `name_${language}`;
    const categoryField = `category_${language}`;
    if (force || !String(output[nameField] || '').trim()) output[nameField] = getMenuTranslation(output.name, output.category, output.price, language);
    if (force || !String(output[categoryField] || '').trim()) output[categoryField] = getCategoryTranslation(output.category, language);
  }
  return output;
}

const translations = Object.fromEntries(menuEntries.map(([,name,,hi,mr]) => [name, [hi,mr]]));
const categories = Object.fromEntries(Object.entries(categoryTranslations).map(([name,value]) => [name,[value.hi,value.mr]]));

module.exports = { menuEntries, translations, categories, normalize, getMenuTranslation, getCategoryTranslation, translateMenuFields, transliterateMenuName };
