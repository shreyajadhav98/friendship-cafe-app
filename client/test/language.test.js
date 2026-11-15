import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({
  configFile: './vite.config.js',
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});
const { LanguageProvider, useLanguage } = await vite.ssrLoadModule('/src/context/LanguageContext.jsx');

function LanguageProbe() {
  const { t, language } = useLanguage();
  return React.createElement('main', { lang: language },
    React.createElement('button', null, t('Get Directions')),
    React.createElement('span', null, t('Ready')),
    React.createElement('h1', null, t('Total revenue')),
    React.createElement('h2', null, t('Book the café for your celebration')));
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
    { code: 'en', direction: 'Get Directions', ready: 'Ready', revenue: 'Total revenue', event: 'Book the café for your celebration' },
    { code: 'hi', direction: 'रास्ता देखें', ready: 'तैयार है', revenue: 'कुल आय', event: 'अपने उत्सव के लिए कैफ़े बुक करें' },
    { code: 'mr', direction: 'मार्ग पहा', ready: 'तयार आहे', revenue: 'एकूण कमाई', event: 'तुमच्या सोहळ्यासाठी कॅफे बुक करा' },
  ]) {
    languageStorage.value = scenario.code;
    const html = renderToString(React.createElement(LanguageProvider, null, React.createElement(LanguageProbe)));
    assert.match(html, new RegExp(`lang="${scenario.code}"`));
    assert.ok(html.includes(scenario.direction), `${scenario.code} directions label`);
    assert.ok(html.includes(scenario.ready), `${scenario.code} order status`);
    assert.ok(html.includes(scenario.revenue), `${scenario.code} billing label`);
    assert.ok(html.includes(scenario.event), `${scenario.code} event booking heading`);
    assert.equal(languageStorage.key, 'friendship_cafe_lang');
  }
});
