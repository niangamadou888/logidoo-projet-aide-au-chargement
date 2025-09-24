const i18n = require('i18n');
const path = require('path');

i18n.configure({
  locales: ['fr', 'en', 'es'],
  defaultLocale: 'fr',
  queryParameter: 'lang',
  directory: path.join(__dirname, '../locales'),
  autoReload: true,
  updateFiles: false,
  objectNotation: true,
  register: global
});

module.exports = i18n;