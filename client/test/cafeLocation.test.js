import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

let vite;
let location;
let getGoogleMapsDirectionsUrl;

before(async () => {
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { middlewareMode: true } });
  ({ CAFE_LOCATION: location, getGoogleMapsDirectionsUrl } = await vite.ssrLoadModule('/src/config/cafeLocation.js'));
});

after(async () => {
  await vite?.close();
});

test('cafe map coordinates resolve to the New Friendships Ice Cafe listing in Survey Nagar', () => {
  assert.equal(location.name, 'New Friendships Ice Cafe');
  assert.equal(location.address, 'Shop No 1, Main Road, near D Y Patil Campus, Salunkhe Nagar, Survey Nagar, Kolhapur, Maharashtra 416007');
  assert.equal(location.lat, 16.666218);
  assert.equal(location.lng, 74.2062729);
  assert.ok(location.lat >= 16.64 && location.lat <= 16.69);
  assert.ok(location.lng >= 74.18 && location.lng <= 74.23);
});

test('Google Maps directions use the verified destination coordinates and full café address', () => {
  const url = new URL(getGoogleMapsDirectionsUrl({ lat: 16.7, lng: 74.2 }));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/dir/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('destination'), '16.666218,74.2062729');
  assert.equal(url.searchParams.get('query'), `${location.name}, ${location.address}`);
  assert.equal(url.searchParams.get('origin'), '16.7,74.2');
});

test('Leaflet modal wires its center and café marker to the shared destination configuration', async () => {
  const component = await readFile(path.resolve('src/components/CafeDirectionsModal.jsx'), 'utf8');
  assert.match(component, /MapContainer center=\{\[destination\.lat, destination\.lng\]\}/);
  assert.match(component, /CircleMarker center=\{\[destination\.lat, destination\.lng\]\}/);
  assert.match(component, /<Popup><strong>\{cafeName\}<\/strong><br \/>\{destination\.address\}<\/Popup>/);
  assert.match(component, /getGoogleMapsDirectionsUrl\(start\)/);
});
