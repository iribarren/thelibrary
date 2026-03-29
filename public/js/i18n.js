/**
 * i18n.js — Lightweight internationalization module.
 * Loads JSON translation files and provides a t() function for string lookup.
 */

const STORAGE_KEY = 'biblioteca_locale';
const DEFAULT_LOCALE = 'es';

let translations = {};
let fallbackTranslations = {};
let currentLocale = localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE;
const listeners = new Set();

export async function init(locale) {
  currentLocale = locale || localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE;
  if (currentLocale !== DEFAULT_LOCALE) {
    fallbackTranslations = await fetchTranslations(DEFAULT_LOCALE);
  }
  translations = await fetchTranslations(currentLocale);
  localStorage.setItem(STORAGE_KEY, currentLocale);
}

async function fetchTranslations(locale) {
  const response = await fetch(`/i18n/${locale}.json`);
  if (!response.ok) throw new Error(`Failed to load locale: ${locale}`);
  return response.json();
}

export function t(key, params = {}) {
  const value = getNestedValue(translations, key)
    ?? getNestedValue(fallbackTranslations, key)
    ?? key;
  return String(value).replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

export function getCurrentLocale() { return currentLocale; }

export async function setLocale(locale) {
  await init(locale);
  listeners.forEach(cb => cb(locale));
}

export function onLocaleChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
