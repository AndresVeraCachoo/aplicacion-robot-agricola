// src/i18n/index.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import esTranslation from "./locales/es/translation.json";
import enTranslation from "./locales/en/translation.json";
import ptTranslation from "./locales/pt/translation.json";

const resources = {
  es: { translation: esTranslation },
  en: { translation: enTranslation },
  pt: { translation: ptTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "es",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;