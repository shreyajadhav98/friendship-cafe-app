const ownerApprovedNames = [
  ['Plain Milkshake','प्लेन मिल्क शेक','प्लेन मिल्क शेक',['Plain Milk Shake']],['Mango Shake','मैंगो शेक','मँगो शेक'],['Strawberry Shake','स्ट्रॉबेरी शेक','स्ट्रॉबेरी शेक'],['Rose Shake','रोज़ शेक','रोज शेक'],['Chocolate Shake','चॉकलेट शेक','चॉकलेट शेक'],['Apple Shake','एप्पल शेक','अॅपल शेक'],['Oreo Shake','ओरियो शेक','ओरिओ शेक'],['Kitkat Shake','किटकैट शेक','किटकॅट शेक',['KitKat Shake']],['Mixed Dry Fruit Shake','ऑल ड्राई फ्रूट्स शेक','ऑल ड्रायफ्रूटस शेक',['All Dryfruits Shake','All Dry Fruits Shake','Mixed Dryfruits Shake']],
  ['Vanilla','वनीला','व्हॅनिला'],['Strawberry','स्ट्रॉबेरी','स्ट्रॉबेरी'],['Alphonso Mango','मैंगो अल्फांसो','मँगो अल्फनसो',['Mango Alphonso']],['Butterscotch','बटरस्कॉच','बटरस्कॉच'],['Cashew Gulkand','काजू गुलकंद','काजू गुलकंद',['Kaju Gulkand']],['Choco Chips','चोको चिप्स','चोको चिप्स'],['Dry Fruit Special','ड्राई फ्रूट स्पेशल','ड्रायफ्रुट स्पेशल',['Dryfruit Special']],['Triple Mix Scoop (3 Flavors)','ट्रिपल मिक्स स्कूप (3 फ्लेवर)','ट्रिपल मिक्स स्कूप (3 फ्लेवर)',['Triple Mix Scoop (3 Flavour)']],
  ['Plain Lassi','प्लेन लस्सी','प्लेन लस्सी'],['Mango Lassi','मैंगो लस्सी','मँगो लस्सी'],['Rose Lassi','रोज़ लस्सी','रोज लस्सी'],['Dryfruits Lassi','ड्राई फ्रूट्स लस्सी','ड्रायफ्रुटस् लस्सी',['Dry Fruits Lassi']],
  ['Vanilla Mastani','वनीला मस्तानी','व्हॅनिला मस्तानी'],['Strawberry Mastani','स्ट्रॉबेरी मस्तानी','स्ट्रॉबेरी मस्तानी'],['Rose Mastani','रोज़ मस्तानी','रोज मस्तानी'],['Mango Mastani','मैंगो मस्तानी','मँगो मस्तानी'],['Butterscotch Mastani','बटरस्कॉच मस्तानी','बटरस्कॉच मस्तानी'],['Chocolate Mastani','चॉकलेट मस्तानी','चॉकलेट मस्तानी'],['Oreo Mastani','ओरियो मस्तानी','ओरिओ मस्तानी'],['KitKit Mastani','किटकैट मस्तानी','किटकॅट मस्तानी',['KitKat Mastani','Kitkat Mastani']],['Dry Fruit Mastani','ड्राई फ्रूट्स मस्तानी','ड्रायफ्रूटस् मस्तानी',['Dryfruits Mastani','Dry Fruits Mastani']],
  ['Special Falooda','स्पेशल फालूदा','स्पेशल फालुदा'],['Fruit Salad','फ्रूट सलाद','फ्रुट सॅलेड'],['Regular Cocktail','रेगुलर कॉकटेल','रेग्युलर कॉक्टेल'],['Special Dry Fruit Cocktail','स्पेशल ड्राई फ्रूट्स कॉकटेल','स्पे. ड्रायफ्रूटस कॉक्टेल',['Spe. Dryfruits Cocktail','Special Dry Fruits Cocktail']],['Titanic Special','टाइटैनिक स्पेशल','टायटॅनिक स्पेशल'],
  ['Hot Coffee','हॉट कॉफी','हॉट कॉफी'],['Hot Chocolate','हॉट चॉकलेट','हॉट चॉकलेट'],['Cold Coffee','कोल्ड कॉफी','कोल्ड कॉफी'],['Cold Chocolate Coffee','कोल्ड चॉकलेट कॉफी','कोल्ड चॉकलेट कॉफी'],['Cold Coffee with Ice Cream','कोल्ड कॉफी विद आइसक्रीम','कोल्ड कॉफी विथ आईस्क्रीम'],['Chocolate Cad-B','चॉकलेट कैड-बी','चॉकलेट कॅड बी',['Chocolate Cad B','Chocolate Cad B / Cad-B']],['Vanilla Cad-B','वनीला कैड-बी','व्हॅनिला कॅड बी',['Vanilla Cad B','Vanilla Cad B / Cad-B']],['Vanilla-Chocolate Mix Cad-B','वनीला चॉकलेट मिक्स कैड-बी','व्हॅनिला चॉकलेट मिक्स कॅड बी',['Vanilla Chocolate Mix Cad B','Vanilla Chocolate Mix Cad B / Cad-B']],['Oreo Cad-B - 90','ओरियो कैड-बी','ओरिओ कॅड बी',['Oreo Cad B','Oreo Cad-B','Oreo Cad B / Cad-B']],['Tea','चाय','चहा',['Chai','Tea / Chai']],
  ['Veg Cheese Pizza','वेज चीज़ पिज़्ज़ा','व्हेज चीज पिझ्झा'],['Veg Corn Pizza','वेज कॉर्न पिज़्ज़ा','व्हेज कॉर्न पिझ्झा'],['Margherita Pizza','मार्गेरिटा पिज़्ज़ा','मार्गेरिटा पिझ्झा'],['Veg Cheese Burst Pizza','वेज चीज़ बर्स्ट पिज़्ज़ा','व्हेज चिज बस्ट पिझ्झा'],['Paneer Tikka Pizza','पनीर टिक्का पिज़्ज़ा','पनीर टिक्का पिझ्झा'],['Veg Tandoori Paneer Pizza','वेज तंदूर पनीर पिज़्ज़ा','व्हेज तंदूर पनीर पिझ्झा',['Veg Tandoor Paneer Pizza']],['All-Veggie Cheese Pizza','ऑल वेजीज़ चीज़ पिज़्ज़ा','ऑल व्हेजीस चिज पिझ्झा',['All Veggies Cheese Pizza']],
  ['Masala Toast','मसाला टोस्ट','मसाला टोस्ट'],['Masala Cheese Toast','मसाला चीज़ टोस्ट','मसाला चीज टोस्ट'],['Veg Crunchy Grilled Sandwich','वेज क्रंची ग्रिल सैंडविच','व्हेज क्रन्ची ग्रील सॅन्डविच',['Veg Crunchy Grill Sandwich']],['Cheese Grilled Sandwich','चीज़ ग्रिल सैंडविच','चिज ग्रील सॅन्डविच',['Cheese Grill Sandwich']],['Cheese Chilli Sandwich','चीज़ चिली सैंडविच','चिज चिली सॅन्डविच'],['Chocolate Grilled Sandwich','चॉकलेट ग्रिल सैंडविच','चॉकलेट ग्रील सॅन्डविच',['Chocolate Grill Sandwich']],['Paneer Tikka Sandwich','पनीर टिक्का सैंडविच','पनीर टिक्का सॅन्डविच'],['Tandoori Paneer Sandwich','तंदूर पनीर सैंडविच','तंदूर पनीर सॅन्डविच',['Tandoor Paneer Sandwich']],['Corn Sandwich','कॉर्न सैंडविच','कॉर्न सॅन्डविच'],['All-Veggie Sandwich','ऑल वेजीज़ सैंडविच','ऑल व्हेजीस सॅन्डविच',['All Veggies Sandwich']],['Triple Cheese Sandwich','ट्रिपल चीज़ सैंडविच','ट्रिपल चिज सॅन्डविच'],
  ['Spicy Veg Burger','स्पाइसी वेज बर्गर','स्पायसी व्हेज बर्गर'],['Simple Veg Burger','सिंपल वेज बर्गर','सिम्पल व्हेज बर्गर'],['Aloo Tikki Burger','आलू टिक्की बर्गर','आलू टिक्की बर्गर'],['Veg Cheese Burger','वेज चीज़ बर्गर','व्हेज चिज बर्गर'],['Veg Corn Burger','वेज कॉर्न बर्गर','व्हेज कॉर्न बर्गर'],['Veg Grilled Cheese Burger','वेज ग्रिल चीज़ बर्गर','व्हेज ग्रील चिज बर्गर',['Veg Grill Cheese Burger']],['Paneer Tikka Burger','पनीर टिक्का बर्गर','पनीर टिक्का बर्गर'],['Maharaja Burger','महाराजा बर्गर','महाराजा बर्गर'],
  ['French Fries','फ्रेंच फ्राइज़','फ्रेंच फ्राईज'],['Peri Peri Fries','पेरी-पेरी फ्राइज़','पेरीपेरी फ्राईज',['Periperi Fries']],['Masala Fries','मसाला फ्राइज़','मसाला फ्राईज'],['Chatpata Fries','चटपटा फ्राइज़','चटपटा फ्राईज',['Catpata Fries']],['Masala Mayo Fries','मसाला मेयो फ्राइज़','मसाला मायो फ्राईज'],['Masala Cheesy Fries','मसाला चीज़ी फ्राइज़','मसाला चिजी फ्राईज',['Masala Cheese Fries']],['Loaded Fries','लोडेड फ्राइज़','लोडेड फ्राईज'],
  ['Tandoor Nuggets','तंदूर नगेट्स (10 पीस)','तंदूर नगेटस् (10 नग)',['Tandoor Nuggets (10 Pcs)']],['Potato Pops','पोटैटो पप्स (10 पीस)','पोटॅटो पप्स (10 नग)',['Potato Pops (10 Pcs)']],['Cheese Corn Nuggets','चीज़ कॉर्न नगेट्स (5 पीस)','चिज कॉर्न नगेटस् (5 नग)',['Cheese Corn Nuggets (5 Pcs)']],['Veg Fingers','वेज फिंगर्स (5 पीस)','व्हेज फिंगर्स (5 नग)',['Veg Fingers (5 Pcs)','Wedge Fingers']]
];

const categoryTranslations = {
  'Thick Milkshake': ['थिक मिल्क शेक','थिक मिल्क शेक'], 'Thick Milk Shake': ['थिक मिल्क शेक','थिक मिल्क शेक'],
  'Ice cream Scoop': ['आइसक्रीम स्कूप','आईस्क्रीम स्कूप'], 'Ice Cream Scoop': ['आइसक्रीम स्कूप','आईस्क्रीम स्कूप'],
  Lassi: ['लस्सी','लस्सी'], 'Mastani Special': ['मस्तानी स्पेशल','मस्तानी स्पेशल'], Cocktails: ['कॉकटेल्स','कॉक्टेल्स'],
  'Coffee Special': ['कॉफी स्पेशल','कॉफी स्पेशल'], Pizza: ['पिज़्ज़ा','पिझ्झा'], 'Grill Sandwich': ['ग्रिल सैंडविच','ग्रील सॅन्डविच'],
  Burger: ['बर्गर','बर्गर'], Fries: ['फ्राइज़','फ्राईज'], Nuggets: ['नगेट्स','नगेटस्']
};

const normalize = (value) => String(value || '').normalize('NFKD').toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const itemTranslations = new Map();
for (const [name, hi, mr, aliases = []] of ownerApprovedNames) for (const variant of [name, ...aliases]) itemTranslations.set(normalize(variant), { hi, mr });
const categoryIndex = new Map(Object.entries(categoryTranslations).map(([name, values]) => [normalize(name), values]));
const culinaryWords = {
  veg:['वेज','व्हेज'], veggie:['वेजी','व्हेजीस'], cheese:['चीज़','चिज'], grilled:['ग्रिल','ग्रील'], grill:['ग्रिल','ग्रील'], sandwich:['सैंडविच','सॅन्डविच'], burger:['बर्गर','बर्गर'], pizza:['पिज़्ज़ा','पिझ्झा'], masala:['मसाला','मसाला'], spicy:['स्पाइसी','स्पायसी'], simple:['सिंपल','सिम्पल'], aloo:['आलू','आलू'], tikki:['टिक्की','टिक्की'], paneer:['पनीर','पनीर'], tandoori:['तंदूरी','तंदुरी'], tandoor:['तंदूर','तंदूर'], corn:['कॉर्न','कॉर्न'], fries:['फ्राइज़','फ्राईज'], french:['फ्रेंच','फ्रेंच'], peri:['पेरी','पेरी'], chatpata:['चटपटा','चटपटा'], mayo:['मेयो','मायो'], loaded:['लोडेड','लोडेड'], nuggets:['नगेट्स','नगेटस्'], potato:['पोटैटो','पोटॅटो'], pops:['पॉप्स','पप्स'], fingers:['फिंगर्स','फिंगर्स'], milkshake:['मिल्क शेक','मिल्क शेक'], shake:['शेक','शेक'], mango:['मैंगो','मँगो'], strawberry:['स्ट्रॉबेरी','स्ट्रॉबेरी'], rose:['रोज़','रोज'], chocolate:['चॉकलेट','चॉकलेट'], apple:['एप्पल','अॅपल'], oreo:['ओरियो','ओरिओ'], kitkat:['किटकैट','किटकॅट'], vanilla:['वनीला','व्हॅनिला'], butterscotch:['बटरस्कॉच','बटरस्कॉच'], dry:['ड्राई','ड्राय'], fruit:['फ्रूट','फ्रुट'], fruits:['फ्रूट्स','फ्रूटस'], special:['स्पेशल','स्पेशल'], lassi:['लस्सी','लस्सी'], mastani:['मस्तानी','मस्तानी'], falooda:['फालूदा','फालुदा'], salad:['सलाद','सॅलेड'], cocktail:['कॉकटेल','कॉक्टेल'], coffee:['कॉफी','कॉफी'], hot:['हॉट','हॉट'], cold:['कोल्ड','कोल्ड'], with:['विद','विथ'], ice:['आइस','आईस'], cream:['क्रीम','क्रीम'], tea:['चाय','चहा'], chai:['चाय','चहा'], cad:['कैड','कॅड'], mix:['मिक्स','मिक्स'], triple:['ट्रिपल','ट्रिपल'], flavors:['फ्लेवर','फ्लेवर'], flavor:['फ्लेवर','फ्लेवर'], margherita:['मार्गेरिटा','मार्गेरिटा'], dryfruit:['ड्राईफ्रूट','ड्रायफ्रूट']
};
const digraphs = { kh:'ख', gh:'घ', chh:'छ', ch:'च', jh:'झ', th:'थ', dh:'ध', ph:'फ', bh:'भ', sh:'श', zh:'झ', ng:'ंग', aa:'आ', ee:'ई', oo:'ऊ', ai:'ऐ', au:'औ' };
const consonants = { k:'क', g:'ग', c:'क', j:'ज', t:'त', d:'द', n:'न', p:'प', b:'ब', m:'म', y:'य', r:'र', l:'ल', v:'व', w:'व', s:'स', h:'ह', f:'फ', z:'ज़', q:'क', x:'क्स' };
const vowels = { a:['अ','ा'], e:['ए','े'], i:['इ','ि'], o:['ओ','ो'], u:['उ','ु'] };

function phoneticDevanagari(value) {
  const input = String(value || '').toLocaleLowerCase('en').replace(/[^a-z]/g, '');
  if (!input) return String(value || '');
  let output = ''; let i = 0; let hasConsonant = false;
  while (i < input.length) {
    const pair = Object.keys(digraphs).sort((a,b) => b.length-a.length).find((key) => input.startsWith(key,i));
    if (pair) { output += digraphs[pair]; i += pair.length; hasConsonant = false; continue; }
    const ch = input[i++];
    if (vowels[ch]) { output += hasConsonant ? vowels[ch][1] : vowels[ch][0]; hasConsonant = false; }
    else if (consonants[ch]) { if (hasConsonant) output += '्'; output += consonants[ch]; hasConsonant = true; }
  }
  if (hasConsonant) output += '्';
  return output || value;
}

export function transliterateMenuName(name, language) {
  if (!['hi','mr'].includes(language)) return String(name || '');
  return String(name || '').split(/(\s+|[-/()])/).map((part) => {
    if (!part || /^(\s+|[-/()])$/.test(part)) return part;
    const mapped = culinaryWords[normalize(part)];
    return mapped?.[language === 'hi' ? 0 : 1] || phoneticDevanagari(part);
  }).join('');
}

export function getLocalizedMenuItemName(item, currentLang = 'en') {
  if (!item || typeof item !== 'object') return '';
  if (!['hi','mr'].includes(currentLang)) return typeof item.name === 'string' ? item.name : '';
  const approved = itemTranslations.get(normalize(item.name));
  if (approved) return approved[currentLang];
  const stored = item[`name_${currentLang}`];
  if (typeof stored === 'string' && stored.trim()) return stored.trim();
  return transliterateMenuName(item.name, currentLang);
}

export function getLocalizedCategoryName(category, items = [], currentLang = 'en') {
  if (!category) return '';
  if (!['hi','mr'].includes(currentLang)) return String(category);
  const approved = categoryIndex.get(normalize(category));
  if (approved) return approved[currentLang === 'hi' ? 0 : 1];
  const item = items.find((entry) => normalize(entry.category) === normalize(category));
  const stored = item?.[`category_${currentLang}`];
  if (typeof stored === 'string' && stored.trim()) return stored.trim();
  return transliterateMenuName(category, currentLang);
}

export function getLocalizedMenuField(item, field, currentLang = 'en') {
  if (!item || typeof item !== 'object' || !['name', 'description', 'category'].includes(field)) return '';
  if (field === 'name') return getLocalizedMenuItemName(item, currentLang);
  if (field === 'category') return getLocalizedCategoryName(item.category, [item], currentLang);
  if (currentLang !== 'en') {
    const localized = item[`${field}_${currentLang}`];
    if (typeof localized === 'string' && localized.trim()) return localized.trim();
  }
  return typeof item[field] === 'string' ? item[field] : '';
}

export function menuSearchText(item) {
  const translatedName = getLocalizedMenuItemName(item, 'hi');
  const translatedNameMr = getLocalizedMenuItemName(item, 'mr');
  const translatedCategory = getLocalizedCategoryName(item?.category, [item], 'hi');
  const translatedCategoryMr = getLocalizedCategoryName(item?.category, [item], 'mr');
  return ['name', 'description', 'category'].flatMap((field) => [item?.[field], item?.[`${field}_hi`], item?.[`${field}_mr`]])
    .concat([translatedName, translatedNameMr, translatedCategory, translatedCategoryMr])
    .filter((value) => typeof value === 'string').join(' ').toLocaleLowerCase();
}

export const ownerApprovedMenuTranslations = ownerApprovedNames;
export const ownerApprovedCategoryTranslations = categoryTranslations;
