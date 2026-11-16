export function getLocalizedMenuField(item, field, currentLang = 'en') {
  if (!item || typeof item !== 'object' || !['name', 'description', 'category'].includes(field)) return '';
  if (currentLang !== 'en') {
    const localized = item[`${field}_${currentLang}`];
    if (typeof localized === 'string' && localized.trim()) return localized.trim();
  }
  return typeof item[field] === 'string' ? item[field] : '';
}

export function menuSearchText(item) {
  return ['name', 'description', 'category'].flatMap((field) => [item?.[field], item?.[`${field}_hi`], item?.[`${field}_mr`]])
    .filter((value) => typeof value === 'string').join(' ').toLocaleLowerCase();
}
