import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTableNumberFromSearch } from '../src/tableNumber.js';

test('QR table query selects the same table in checkout', () => {
  assert.equal(getTableNumberFromSearch('?table=5'), '5');
  assert.equal(getTableNumberFromSearch('?table=T-12'), 'T-12');
  assert.equal(getTableNumberFromSearch('?campaign=lunch'), '');
  assert.equal(getTableNumberFromSearch('?table=%20%20'), '');
});

test('remote QR context is detected and does not override explicit table context', async () => {
  const { getOrderingContextFromSearch } = await import('../src/tableNumber.js');
  assert.deepEqual(getOrderingContextFromSearch('?mode=remote'), { mode: 'remote', tableNumber: 'Remote', notice: 'remote' });
  assert.deepEqual(getOrderingContextFromSearch('?table=5'), { mode: 'table', tableNumber: '5', notice: 'table' });
  assert.deepEqual(getOrderingContextFromSearch('?table=5&mode=remote'), { mode: 'table', tableNumber: '5', notice: 'table' });
});

