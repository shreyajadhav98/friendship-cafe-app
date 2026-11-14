import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations, supportedLanguages } from '../i18n/translations';

const STORAGE_KEY = 'friendship_cafe_lang';
const LanguageContext = createContext(null);

function translate(language, key) {
  const dictionary = translations[language] || translations.en;
  if (dictionary[key]) return dictionary[key];
  const stockNotice = /^(.*) marked (in stock|out of stock)\. Customer menu updated\.$/.exec(key);
  if (stockNotice) {
    const statusKey = stockNotice[2] === 'in stock' ? 'marked in stock' : 'marked out of stock';
    const status = dictionary[statusKey] || dictionary[stockNotice[2]] || stockNotice[2];
    return `${stockNotice[1]} ${status}. ${dictionary['Customer menu updated.'] || 'Customer menu updated.'}`;
  }
  const removedNotice = /^(.*) removed from the menu\.$/.exec(key);
  if (removedNotice) return `${removedNotice[1]} ${dictionary['removed from the menu.'] || 'removed from the menu.'}`;
  return translations.en[key] || key;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return supportedLanguages.includes(stored) ? stored : 'en';
    } catch {
      return 'en';
    }
  });

  function setLanguage(nextLanguage) {
    if (!supportedLanguages.includes(nextLanguage)) return;
    setLanguageState(nextLanguage);
    try { window.localStorage.setItem(STORAGE_KEY, nextLanguage); } catch { /* In-memory language switching still works if storage is unavailable. */ }
  }

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key) => translate(language, key),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
