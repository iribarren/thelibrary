import { createI18n } from 'vue-i18n'
import es from '@/assets/i18n/es.json'
import en from '@/assets/i18n/en.json'

const STORAGE_KEY = 'biblioteca_locale'
const DEFAULT_LOCALE = 'es'

const savedLocale = localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { es, en },
})

export function setLocale(locale) {
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_KEY, locale)
}

export function getCurrentLocale() {
  return i18n.global.locale.value
}

export default i18n
