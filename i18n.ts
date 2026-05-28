import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'dr_platform_language';
const savedLanguage = localStorage.getItem(LANGUAGE_KEY);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en }
    },
    lng: savedLanguage === 'en' ? 'en' : 'ar',
    fallbackLng: 'ar',
    interpolation: { escapeValue: false }
  });

i18n.on('languageChanged', (lang) => {
  localStorage.setItem(LANGUAGE_KEY, lang);
});

export default i18n;
