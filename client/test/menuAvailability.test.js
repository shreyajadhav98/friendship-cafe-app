import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAddItemToCart, isItemUnavailable } from '../src/menuPresentation.js';

test('customer menu disables and grays out an item after the availability payload changes', () => {
  const availablePayload = { _id: 'item-1', isAvailable: true };
  assert.equal(isItemUnavailable(availablePayload), false);
  assert.equal(canAddItemToCart(availablePayload), true);

  // This is the same `isAvailable` field returned by GET /api/menu after AdminMenu toggles stock.
  const outOfStockPayload = { ...availablePayload, isAvailable: false };
  assert.equal(isItemUnavailable(outOfStockPayload), true);
  assert.equal(canAddItemToCart(outOfStockPayload), false);

  const restockedPayload = { ...outOfStockPayload, isAvailable: true };
  assert.equal(isItemUnavailable(restockedPayload), false);
  assert.equal(canAddItemToCart(restockedPayload), true);
});
