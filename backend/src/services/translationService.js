const i18n = require('../config/i18n');

class TranslationService {
  static translateResponse(data, language, translationKey) {
    if (Array.isArray(data)) {
      return data.map(item => this.translateItem(item, language));
    }
    return this.translateItem(data, language);
  }

  static translateItem(item, language) {
    if (item.getTranslated && typeof item.getTranslated === 'function') {
      return item.getTranslated(language);
    }
    return item;
  }

  static getErrorMessage(errorKey, language, params = {}) {
    i18n.setLocale(language);
    return i18n.t(errorKey, params);
  }

  static getValidationMessages(language) {
    i18n.setLocale(language);
    return {
      required: i18n.t('validation.required'),
      email: i18n.t('validation.email'),
      minLength: i18n.t('validation.minLength'),
      maxLength: i18n.t('validation.maxLength')
    };
  }
}

module.exports = TranslationService;