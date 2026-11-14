import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return <label className="language-switcher">
    <span className="sr-only">{t('Select language')}</span>
    <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('Select language')}>
      <option value="en">English</option>
      <option value="hi">हिंदी</option>
      <option value="mr">मराठी</option>
    </select>
  </label>;
}
