const acceptLanguage = require('accept-language-parser');
const i18n = require('../config/i18n');

const languageMiddleware = (req, res, next) => {
  let language = 'fr'; // langue par défaut

  // 1. Vérifier le header Accept-Language
  if (req.headers['accept-language']) {
    const languages = acceptLanguage.parse(req.headers['accept-language']);
    const supportedLanguages = ['fr', 'en', 'es'];
    const preferredLanguage = languages.find(lang =>
      supportedLanguages.includes(lang.code)
    );
    if (preferredLanguage) {
      language = preferredLanguage.code;
    }
  }

  // 2. Vérifier le paramètre de requête
  if (req.query.lang && ['fr', 'en', 'es'].includes(req.query.lang)) {
    language = req.query.lang;
  }

  // 3. Vérifier le header personnalisé
  if (req.headers['x-language'] && ['fr', 'en', 'es'].includes(req.headers['x-language'])) {
    language = req.headers['x-language'];
  }

  req.language = language;
  i18n.setLocale(req, language);
  next();
};

module.exports = languageMiddleware;