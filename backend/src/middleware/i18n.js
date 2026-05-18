/**
 * i18n Middleware — Backend
 *
 * Membaca header `Accept-Language` dari setiap request dan melampirkan
 * fungsi `req.t(key)` serta objek `req.locale` ke request object.
 *
 * Digunakan oleh semua controller:
 *   req.t('auth.invalidCredentials')  → 'Invalid email or password.' (en)
 *   req.t('auth.invalidCredentials')  → 'Email atau password salah.' (id)
 */
const en = require('../locales/en');
const id = require('../locales/id');

const locales = { en, id };

/**
 * Resolve nested key dari locale object.
 * Contoh: resolve(locale, 'auth.invalidCredentials') → string
 */
function resolve(obj, key) {
  const parts = key.split('.');
  let value = obj;
  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) break;
  }
  return value;
}

/**
 * Middleware: attach req.t() ke semua request
 */
const i18n = (req, res, next) => {
  // Ambil bahasa dari header, default ke 'en'
  const rawLang = (req.headers['accept-language'] || 'en').toLowerCase().trim();
  const lang = locales[rawLang] ? rawLang : 'en';
  const locale = locales[lang];

  /**
   * req.t(key, ...args)
   * - key: dot-notation string (e.g. 'auth.invalidCredentials')
   * - args: optional arguments untuk pesan yang berupa fungsi
   *
   * Contoh: req.t('transfers.created', 'TRF-001') → 'Transfer TRF-001 created successfully.'
   */
  req.t = (key, ...args) => {
    let value = resolve(locale, key);
    // Fallback ke English jika tidak ditemukan
    if (value === undefined) value = resolve(locales.en, key);
    if (value === undefined) return key; // fallback ke key itu sendiri
    if (typeof value === 'function') return value(...args);
    return value;
  };

  req.lang = lang;
  next();
};

module.exports = { i18n };
