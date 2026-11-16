import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const clientRoot = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({
  root: clientRoot,
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});
const { LanguageProvider, useLanguage } = await vite.ssrLoadModule('/src/context/LanguageContext.jsx');
const { getLocalizedMenuField, menuSearchText } = await vite.ssrLoadModule('/src/menuLocalization.js');

function LanguageProbe() {
  const { t, language } = useLanguage();
  const sample = { name: 'Chai', name_hi: 'चाय', name_mr: 'चहा', category: 'Beverages', category_hi: 'पेय', category_mr: 'पेये' };
  return React.createElement('main', { lang: language },
    React.createElement('button', null, t('Get Directions')),
    React.createElement('span', null, t('Ready')),
    React.createElement('h1', null, t('Total revenue')),
    React.createElement('h2', null, t('Book the café for your celebration')),
    React.createElement('h3', null, getLocalizedMenuField(sample, 'name', language)),
    React.createElement('h4', null, getLocalizedMenuField(sample, 'category', language)));
}

test('saved English, Hindi, and Marathi preferences render matching UI labels', async (context) => {
  context.after(async () => {
    delete globalThis.window;
    await vite.close();
  });

  const languageStorage = { value: 'en', key: '' };
  globalThis.window = { localStorage: {
    getItem(key) { languageStorage.key = key; return languageStorage.value; },
    setItem(key, value) { languageStorage.key = key; languageStorage.value = value; },
  } };

  for (const scenario of [
    { code: 'en', direction: 'Get Directions', ready: 'Ready', revenue: 'Total revenue', event: 'Book the café for your celebration', name: 'Chai', category: 'Beverages' },
    { code: 'hi', direction: 'रास्ता देखें', ready: 'तैयार है', revenue: 'कुल आय', event: 'अपने उत्सव के लिए कैफ़े बुक करें', name: 'चाय', category: 'पेय' },
    { code: 'mr', direction: 'मार्ग पहा', ready: 'तयार आहे', revenue: 'एकूण कमाई', event: 'तुमच्या सोहळ्यासाठी कॅफे बुक करा', name: 'चहा', category: 'पेये' },
  ]) {
    languageStorage.value = scenario.code;
    const html = renderToString(React.createElement(LanguageProvider, null, React.createElement(LanguageProbe)));
    assert.match(html, new RegExp(`lang="${scenario.code}"`));
    assert.ok(html.includes(scenario.direction), `${scenario.code} directions label`);
    assert.ok(html.includes(scenario.ready), `${scenario.code} order status`);
    assert.ok(html.includes(scenario.revenue), `${scenario.code} billing label`);
    assert.ok(html.includes(scenario.event), `${scenario.code} event booking heading`);
    assert.ok(html.includes(scenario.name), `${scenario.code} localized menu name`);
    assert.ok(html.includes(scenario.category), `${scenario.code} localized menu category`);
    assert.equal(languageStorage.key, 'friendship_cafe_lang');
  }
});

test('menu search content includes English, Hindi, and Marathi names/categories', async () => {
  const item = { name: 'Chai', name_hi: 'चाय', name_mr: 'चहा', category: 'Beverages', category_hi: 'पेय', category_mr: 'पेये' };
  const searchable = menuSearchText(item);
  for (const word of ['chai', 'चाय', 'चहा', 'beverages', 'पेय', 'पेये']) assert.ok(searchable.includes(word));
  assert.equal(getLocalizedMenuField({ name: 'Coffee', name_hi: '' }, 'name', 'hi'), 'Coffee');
});
