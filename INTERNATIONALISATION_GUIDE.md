# Guide d'Implémentation de l'Internationalisation (i18n)

## Stack Technique Identifié
- **Frontend**: Angular 19.1.0 avec Angular Material, Bootstrap, TypeScript
- **Backend**: Node.js avec Express 5.1.0, Mongoose, JWT
- **Base de données**: MongoDB

## 1. CONFIGURATION FRONTEND (ANGULAR)

### 1.1 Installation des dépendances i18n
```bash
# Dans le dossier frontend/
npm install @angular/localize
ng add @angular/localize
```

### 1.2 Modification du package.json frontend
```json
{
  "scripts": {
    "build:fr": "ng build --configuration=production --localize=fr",
    "build:en": "ng build --configuration=production --localize=en",
    "build:es": "ng build --configuration=production --localize=es",
    "extract-i18n": "ng extract-i18n",
    "start:fr": "ng serve --configuration=development --localize=fr",
    "start:en": "ng serve --configuration=development --localize=en"
  }
}
```

### 1.3 Modification du angular.json
```json
{
  "projects": {
    "front-end": {
      "i18n": {
        "sourceLocale": "fr",
        "locales": {
          "en": {
            "translation": "src/locale/messages.en.xlf",
            "baseHref": "/en/"
          },
          "es": {
            "translation": "src/locale/messages.es.xlf",
            "baseHref": "/es/"
          }
        }
      },
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "localize": true,
            "outputPath": "dist/front-end"
          },
          "configurations": {
            "production": {
              "localize": true,
              "outputHashing": "all"
            },
            "development": {
              "localize": ["fr"]
            },
            "fr": {
              "localize": ["fr"]
            },
            "en": {
              "localize": ["en"]
            },
            "es": {
              "localize": ["es"]
            }
          }
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "fr": {
              "buildTarget": "front-end:build:fr"
            },
            "en": {
              "buildTarget": "front-end:build:en"
            }
          }
        }
      }
    }
  }
}
```

### 1.4 Structure des fichiers de traduction
```
frontend/src/
├── locale/
│   ├── messages.fr.xlf       # Français (source)
│   ├── messages.en.xlf       # Anglais
│   └── messages.es.xlf       # Espagnol
└── assets/
    └── i18n/
        ├── fr.json           # Traductions JSON pour contenu dynamique
        ├── en.json
        └── es.json
```

### 1.5 Service de langue Angular
```typescript
// src/app/core/services/language.service.ts
import { Injectable, LOCALE_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLangSubject = new BehaviorSubject<string>('fr');
  public currentLang$ = this.currentLangSubject.asObservable();

  private translations: any = {};

  constructor(
    private http: HttpClient,
    @Inject(LOCALE_ID) private locale: string
  ) {
    this.currentLangSubject.next(this.locale);
    this.loadTranslations(this.locale);
  }

  async loadTranslations(lang: string): Promise<void> {
    try {
      this.translations[lang] = await this.http.get(`/assets/i18n/${lang}.json`).toPromise();
    } catch (error) {
      console.error(`Erreur lors du chargement des traductions ${lang}:`, error);
    }
  }

  translate(key: string, params?: any): string {
    const translation = this.getNestedProperty(this.translations[this.locale], key);
    if (!translation) return key;

    if (params) {
      return this.interpolate(translation, params);
    }
    return translation;
  }

  changeLanguage(lang: string): void {
    // Redirection vers la version localisée de l'application
    const currentPath = window.location.pathname;
    let newPath: string;

    if (lang === 'fr') {
      newPath = currentPath.replace(/^\/(en|es)/, '');
    } else {
      newPath = `/${lang}${currentPath.replace(/^\/(en|es)/, '')}`;
    }

    window.location.href = newPath;
  }

  private getNestedProperty(obj: any, key: string): string {
    return key.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  private interpolate(text: string, params: any): string {
    return text.replace(/{{(\w+)}}/g, (match, key) => params[key] || match);
  }
}
```

### 1.6 Composant sélecteur de langue
```typescript
// src/app/shared/components/language-selector/language-selector.component.ts
import { Component } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-language-selector',
  template: `
    <mat-select
      [value]="currentLang"
      (selectionChange)="onLanguageChange($event.value)"
      [attr.aria-label]="'LANGUAGE.SELECT' | i18n"
    >
      <mat-option value="fr">🇫🇷 Français</mat-option>
      <mat-option value="en">🇬🇧 English</mat-option>
      <mat-option value="es">🇪🇸 Español</mat-option>
    </mat-select>
  `
})
export class LanguageSelectorComponent {
  currentLang: string;

  constructor(private languageService: LanguageService) {
    this.languageService.currentLang$.subscribe(lang => {
      this.currentLang = lang;
    });
  }

  onLanguageChange(lang: string): void {
    this.languageService.changeLanguage(lang);
  }
}
```

### 1.7 Pipe de traduction personnalisé
```typescript
// src/app/shared/pipes/translate.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';

@Pipe({
  name: 'translate',
  pure: false
})
export class TranslatePipe implements PipeTransform {
  constructor(private languageService: LanguageService) {}

  transform(key: string, params?: any): string {
    return this.languageService.translate(key, params);
  }
}
```

### 1.8 Utilisation dans les templates
```html
<!-- Utilisation avec Angular i18n -->
<h1 i18n="@@welcome.title">Bienvenue sur Logidoo</h1>
<p i18n="@@welcome.description">Votre solution d'aide au chargement</p>

<!-- Utilisation avec le pipe personnalisé pour contenu dynamique -->
<h2>{{ 'dashboard.statistics' | translate }}</h2>
<p>{{ 'user.greeting' | translate: {name: user.name} }}</p>

<!-- Attributs avec i18n -->
<input
  type="text"
  i18n-placeholder="@@input.search.placeholder"
  placeholder="Rechercher..."
>
```

### 1.9 Configuration main.ts
```typescript
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';

// Import des locales
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';

// Enregistrement des locales
registerLocaleData(localeFr);
registerLocaleData(localeEn);
registerLocaleData(localeEs);

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(HttpClientModule),
    // Autres providers...
  ]
});
```

## 2. CONFIGURATION BACKEND (NODE.JS/EXPRESS)

### 2.1 Installation des dépendances i18n backend
```bash
# Dans le dossier backend/
npm install i18n i18n-express accept-language-parser
```

### 2.2 Modification du package.json backend
```json
{
  "dependencies": {
    "i18n": "^0.15.1",
    "i18n-express": "^2.1.1",
    "accept-language-parser": "^1.5.0"
  }
}
```

### 2.3 Configuration i18n backend
```javascript
// src/config/i18n.js
const i18n = require('i18n');
const path = require('path');

i18n.configure({
  locales: ['fr', 'en', 'es'],
  defaultLocale: 'fr',
  queryParameter: 'lang',
  directory: path.join(__dirname, '../locales'),
  autoReload: true,
  updateFiles: false,
  api: {
    '__': 't',
    '__n': 'tn'
  },
  register: global
});

module.exports = i18n;
```

### 2.4 Structure des fichiers de traduction backend
```
backend/src/
├── locales/
│   ├── fr.json
│   ├── en.json
│   └── es.json
└── middleware/
    └── language.js
```

### 2.5 Middleware de détection de langue
```javascript
// src/middleware/language.js
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
```

### 2.6 Configuration du serveur Express
```javascript
// server.js
const express = require('express');
const i18n = require('./src/config/i18n');
const languageMiddleware = require('./src/middleware/language');

const app = express();

// Configuration i18n
app.use(i18n.init);
app.use(languageMiddleware);

// Middleware pour ajouter la traduction aux réponses
app.use((req, res, next) => {
  res.t = req.t || i18n.t;
  next();
});

// Routes avec traductions
app.get('/api/status', (req, res) => {
  res.json({
    message: req.t('api.status.success'),
    language: req.language
  });
});

// Gestion d'erreurs avec traductions
app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    error: req.t('errors.general'),
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});
```

### 2.7 Modèles Mongoose avec i18n
```javascript
// src/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    fr: { type: String, required: true },
    en: { type: String, required: true },
    es: { type: String, required: true }
  },
  description: {
    fr: { type: String },
    en: { type: String },
    es: { type: String }
  },
  // Autres champs...
}, {
  timestamps: true
});

// Méthode pour obtenir le contenu traduit
productSchema.methods.getTranslated = function(language = 'fr') {
  return {
    _id: this._id,
    name: this.name[language] || this.name.fr,
    description: this.description[language] || this.description.fr,
    // Autres champs...
  };
};

module.exports = mongoose.model('Product', productSchema);
```

### 2.8 Service de traduction backend
```javascript
// src/services/translationService.js
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
```

## 3. FICHIERS DE TRADUCTION

### 3.1 Fichiers frontend (JSON)
```json
// frontend/src/assets/i18n/fr.json
{
  "navigation": {
    "home": "Accueil",
    "dashboard": "Tableau de bord",
    "settings": "Paramètres",
    "logout": "Déconnexion"
  },
  "dashboard": {
    "title": "Tableau de bord",
    "statistics": "Statistiques",
    "recent_activity": "Activité récente"
  },
  "user": {
    "profile": "Profil",
    "greeting": "Bonjour {{name}}"
  },
  "forms": {
    "submit": "Soumettre",
    "cancel": "Annuler",
    "save": "Enregistrer"
  },
  "messages": {
    "success": "Opération réussie",
    "error": "Une erreur s'est produite",
    "loading": "Chargement en cours..."
  }
}
```

```json
// frontend/src/assets/i18n/en.json
{
  "navigation": {
    "home": "Home",
    "dashboard": "Dashboard",
    "settings": "Settings",
    "logout": "Logout"
  },
  "dashboard": {
    "title": "Dashboard",
    "statistics": "Statistics",
    "recent_activity": "Recent Activity"
  },
  "user": {
    "profile": "Profile",
    "greeting": "Hello {{name}}"
  },
  "forms": {
    "submit": "Submit",
    "cancel": "Cancel",
    "save": "Save"
  },
  "messages": {
    "success": "Operation successful",
    "error": "An error occurred",
    "loading": "Loading..."
  }
}
```

### 3.2 Fichiers backend (JSON)
```json
// backend/src/locales/fr.json
{
  "api": {
    "status": {
      "success": "API fonctionnelle"
    }
  },
  "errors": {
    "general": "Une erreur s'est produite",
    "notFound": "Ressource non trouvée",
    "unauthorized": "Non autorisé",
    "validation": "Erreur de validation"
  },
  "validation": {
    "required": "Ce champ est requis",
    "email": "Adresse email invalide",
    "minLength": "Minimum {{min}} caractères",
    "maxLength": "Maximum {{max}} caractères"
  },
  "auth": {
    "login": {
      "success": "Connexion réussie",
      "failed": "Identifiants incorrects"
    },
    "register": {
      "success": "Inscription réussie",
      "emailExists": "Cette adresse email existe déjà"
    }
  }
}
```

## 4. ACCESSIBILITÉ

### 4.1 Directives ARIA et langues
```typescript
// src/app/shared/directives/lang-aware.directive.ts
import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';

@Directive({
  selector: '[appLangAware]'
})
export class LangAwareDirective implements OnInit {
  @Input() langCode?: string;

  constructor(
    private el: ElementRef,
    private languageService: LanguageService
  ) {}

  ngOnInit() {
    this.languageService.currentLang$.subscribe(lang => {
      this.el.nativeElement.setAttribute('lang', this.langCode || lang);
    });
  }
}
```

### 4.2 Support RTL (Right-to-Left)
```scss
// src/styles/rtl.scss
[dir="rtl"] {
  .container {
    direction: rtl;
    text-align: right;
  }

  .nav-item {
    margin-left: 0;
    margin-right: 1rem;
  }

  .btn-group {
    direction: ltr;
  }
}

[dir="ltr"] {
  .container {
    direction: ltr;
    text-align: left;
  }
}
```

### 4.3 Service de direction de texte
```typescript
// src/app/core/services/text-direction.service.ts
import { Injectable } from '@angular/core';
import { LanguageService } from './language.service';

@Injectable({
  providedIn: 'root'
})
export class TextDirectionService {
  private rtlLanguages = ['ar', 'he', 'fa'];

  constructor(private languageService: LanguageService) {}

  getDirection(lang?: string): 'ltr' | 'rtl' {
    const currentLang = lang || this.getCurrentLanguage();
    return this.rtlLanguages.includes(currentLang) ? 'rtl' : 'ltr';
  }

  updateBodyDirection(): void {
    const direction = this.getDirection();
    document.body.setAttribute('dir', direction);
  }

  private getCurrentLanguage(): string {
    // Implémentation pour récupérer la langue actuelle
    return 'fr';
  }
}
```

## 5. OPTIMISATIONS ET PERFORMANCE

### 5.1 Lazy loading des traductions
```typescript
// src/app/core/services/translation-loader.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TranslationLoaderService {
  private cache = new Map<string, any>();

  constructor(private http: HttpClient) {}

  loadTranslations(lang: string): Observable<any> {
    if (this.cache.has(lang)) {
      return of(this.cache.get(lang));
    }

    return this.http.get(`/assets/i18n/${lang}.json`).pipe(
      map(translations => {
        this.cache.set(lang, translations);
        return translations;
      }),
      catchError(error => {
        console.error(`Erreur lors du chargement des traductions ${lang}:`, error);
        return of({});
      })
    );
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

### 5.2 Configuration webpack pour optimiser les bundles par langue
```javascript
// webpack.config.js (si nécessaire)
const path = require('path');

module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        locale: {
          test: /[\\/]locale[\\/]/,
          name: 'locale',
          chunks: 'all',
        },
      },
    },
  },
};
```

## 6. DÉPLOIEMENT ET CONFIGURATION SERVEUR

### 6.1 Configuration nginx pour multi-langue
```nginx
# /etc/nginx/sites-available/logidoo
server {
    listen 80;
    server_name logidoo.com;
    root /var/www/logidoo/dist/front-end;
    index index.html;

    # Configuration pour les langues
    location /en/ {
        try_files $uri $uri/ /en/index.html;
    }

    location /es/ {
        try_files $uri $uri/ /es/index.html;
    }

    # Français par défaut
    location / {
        try_files $uri $uri/ /fr/index.html;
    }

    # API backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6.2 Variables d'environnement
```bash
# .env
DEFAULT_LANGUAGE=fr
SUPPORTED_LANGUAGES=fr,en,es
ENABLE_I18N=true
```

### 6.3 Script de build pour toutes les langues
```bash
#!/bin/bash
# scripts/build-all-languages.sh

echo "Building all language versions..."

# Build du frontend pour toutes les langues
cd frontend
npm run build

# Copie des assets partagés
cp -r dist/front-end/assets/ dist/front-end/fr/assets/
cp -r dist/front-end/assets/ dist/front-end/en/assets/
cp -r dist/front-end/assets/ dist/front-end/es/assets/

echo "Build completed for all languages!"
```

## 7. TESTS

### 7.1 Tests unitaires avec i18n
```typescript
// src/app/shared/components/language-selector/language-selector.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { LanguageSelectorComponent } from './language-selector.component';
import { LanguageService } from '../../core/services/language.service';

describe('LanguageSelectorComponent', () => {
  let component: LanguageSelectorComponent;
  let languageService: jasmine.SpyObj<LanguageService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('LanguageService', ['changeLanguage']);

    TestBed.configureTestingModule({
      declarations: [LanguageSelectorComponent],
      providers: [
        { provide: LanguageService, useValue: spy }
      ]
    });

    languageService = TestBed.inject(LanguageService) as jasmine.SpyObj<LanguageService>;
  });

  it('should change language when selection changes', () => {
    component.onLanguageChange('en');
    expect(languageService.changeLanguage).toHaveBeenCalledWith('en');
  });
});
```

### 7.2 Tests E2E avec Cypress pour i18n
```typescript
// cypress/e2e/i18n.cy.ts
describe('Internationalization', () => {
  it('should change language and display correct content', () => {
    cy.visit('/');

    // Vérifier le contenu français par défaut
    cy.contains('Accueil').should('be.visible');

    // Changer vers l'anglais
    cy.get('[data-cy=language-selector]').click();
    cy.get('[data-cy=lang-en]').click();

    // Vérifier le contenu anglais
    cy.url().should('include', '/en');
    cy.contains('Home').should('be.visible');
  });
});
```

## 8. COMMANDES DE DÉVELOPPEMENT

### 8.1 Scripts npm pour le développement i18n
```bash
# Extraction des textes à traduire
npm run extract-i18n

# Développement en français
npm run start:fr

# Développement en anglais
npm run start:en

# Build de production pour toutes les langues
npm run build:all-langs

# Tests avec support i18n
npm run test:i18n
```

### 8.2 Validation des traductions
```bash
# Script de validation des clés de traduction
node scripts/validate-translations.js
```

```javascript
// scripts/validate-translations.js
const fs = require('fs');
const path = require('path');

const validateTranslations = () => {
  const localesDir = path.join(__dirname, '../frontend/src/assets/i18n');
  const files = fs.readdirSync(localesDir);

  const translations = {};

  files.forEach(file => {
    const lang = path.basename(file, '.json');
    translations[lang] = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
  });

  // Vérifier que toutes les clés sont présentes dans toutes les langues
  const allKeys = new Set();
  Object.values(translations).forEach(trans => {
    const keys = getAllKeys(trans);
    keys.forEach(key => allKeys.add(key));
  });

  Object.entries(translations).forEach(([lang, trans]) => {
    const langKeys = new Set(getAllKeys(trans));
    allKeys.forEach(key => {
      if (!langKeys.has(key)) {
        console.warn(`Clé manquante "${key}" dans la langue ${lang}`);
      }
    });
  });
};

const getAllKeys = (obj, prefix = '') => {
  let keys = [];
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  });
  return keys;
};

validateTranslations();
```

## RÉSUMÉ DES MODIFICATIONS NÉCESSAIRES

### Fichiers à créer :
1. `INTERNATIONALISATION_GUIDE.md` (ce fichier)
2. `frontend/src/locale/` (dossier + fichiers .xlf)
3. `frontend/src/assets/i18n/` (dossier + fichiers .json)
4. `frontend/src/app/core/services/language.service.ts`
5. `frontend/src/app/shared/components/language-selector/`
6. `frontend/src/app/shared/pipes/translate.pipe.ts`
7. `backend/src/config/i18n.js`
8. `backend/src/locales/` (dossier + fichiers .json)
9. `backend/src/middleware/language.js`
10. `backend/src/services/translationService.js`

### Fichiers à modifier :
1. `frontend/package.json` (scripts + dépendances)
2. `frontend/angular.json` (configuration i18n)
3. `frontend/src/main.ts` (locales)
4. `backend/package.json` (dépendances)
5. `backend/server.js` (middleware i18n)

### Configuration serveur :
1. Configuration nginx pour routing multi-langue
2. Variables d'environnement
3. Scripts de build automatisés

Cette implémentation garantit :
- ✅ Support complet multi-langue (frontend + backend)
- ✅ Accessibilité (ARIA, support RTL)
- ✅ Performance optimisée (lazy loading, cache)
- ✅ SEO-friendly (URLs localisées)
- ✅ Maintenance facilitée (validation automatique)