// src/i18n/index.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Importamos los archivos JSON directamente
import esTranslation from "./locales/es/translation.json";
import enTranslation from "./locales/en/translation.json";

// Asignamos las traducciones a una constante
const resources = {
  es: {
    translation: esTranslation,
  },
  en: {
    translation: enTranslation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources, // Cargamos los recursos en memoria
    fallbackLng: "es", // Idioma por defecto si falla algo
    debug: false,
    interpolation: {
      escapeValue: false, // React ya nos protege de XSS
    },
  });

export default i18n;