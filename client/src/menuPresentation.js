export function isItemUnavailable(item) {
  return item?.isAvailable === false;
}

export function canAddItemToCart(item) {
  return Boolean(item) && !isItemUnavailable(item);
}
