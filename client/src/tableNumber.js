export function getTableNumberFromSearch(search) {
  const value = new URLSearchParams(search || '').get('table');
  return typeof value === 'string' ? value.trim().slice(0, 30) : '';
}

export function getOrderingContextFromSearch(search) {
  const params = new URLSearchParams(search || '');
  const tableNumber = getTableNumberFromSearch(search);
  const isRemote = !tableNumber && params.get('mode')?.trim().toLowerCase() === 'remote';
  return {
    mode: isRemote ? 'remote' : 'table',
    tableNumber: tableNumber || (isRemote ? 'Remote' : ''),
    notice: tableNumber ? 'table' : (isRemote ? 'remote' : '')
  };
}
