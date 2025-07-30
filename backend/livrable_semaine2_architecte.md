# Livrable Semaine 2 - Architecte Logiciel (Architecture Simplifiée)
## Module "Aide au Chargement" Logidoo

**Projet :** Module d'optimisation de chargement pour l'écosystème Logidoo  
**Date :** Semaine 2  
**Livrable groupe 24 - Architecte Logiciel**  
**Version :** 2.1 - Architecture Monolithique Simplifiée


## 2. Structure des Projets

### 2.1 Structure Backend (Node.js/Express)

```
aide-chargement-backend/
│
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── README.md
├── docker-compose.yml
├── Dockerfile
│
├── src/
│   │
│   ├── app.js                     # Point d'entrée principal
│   ├── server.js                  # Serveur HTTP
│   │
│   ├── config/                    # Configuration
│   │   ├── database.js           # Config MongoDB
│   │   ├── redis.js              # Config Redis
│   │   ├── auth.js               # Config JWT
│   │   ├── constants.js          # Constantes globales
│   │   └── environment.js        # Variables d'environnement
│   │
│   ├── middleware/                # Middleware Express
│   │   ├── auth.js               # Authentification JWT
│   │   ├── cors.js               # Configuration CORS
│   │   ├── errorHandler.js       # Gestion des erreurs
│   │   ├── logger.js             # Logging des requêtes
│   │   ├── rateLimiter.js        # Limitation du taux de requêtes
│   │   └── validation.js         # Validation des données
│   │
│   ├── routes/                    # Routes API
│   │   ├── index.js              # Routes principales
│   │   ├── auth.js               # Routes authentification
│   │   ├── projects.js           # Routes projets
│   │   ├── packages.js           # Routes colis
│   │   ├── containers.js         # Routes conteneurs
│   │   ├── optimization.js       # Routes calculs
│   │   ├── export.js             # Routes export PDF/Excel
│   │   └── integration.js        # Routes intégration OMS
│   │
│   ├── controllers/               # Contrôleurs (Presentation Layer)
│   │   ├── authController.js     # Authentification
│   │   ├── projectController.js  # Gestion projets
│   │   ├── packageController.js  # Gestion colis
│   │   ├── containerController.js # Gestion conteneurs
│   │   ├── optimizationController.js # Calculs d'optimisation
│   │   ├── exportController.js   # Export documents
│   │   └── integrationController.js # Intégration OMS
│   │
│   ├── services/                  # Services métier (Business Layer)
│   │   ├── projectService.js     # Logique métier projets
│   │   ├── packageService.js     # Logique métier colis
│   │   ├── containerService.js   # Logique métier conteneurs
│   │   ├── optimizationService.js # Service optimisation
│   │   ├── visualizationService.js # Service visualisation
│   │   ├── exportService.js      # Service export
│   │   ├── cacheService.js       # Service cache Redis
│   │   └── omsService.js         # Service intégration OMS
│   │
│   ├── algorithms/                # Moteur d'algorithmes
│   │   ├── index.js              # Interface principale
│   │   ├── binPacking/           # Algorithmes bin packing
│   │   │   ├── firstFitDecreasing.js
│   │   │   ├── bestFit.js
│   │   │   └── rotationHandler.js
│   │   ├── optimization/         # Optimisations
│   │   │   ├── weightOptimizer.js
│   │   │   ├── spaceOptimizer.js
│   │   │   └── constraintValidator.js
│   │   └── utils/                # Utilitaires algorithmes
│   │       ├── geometryUtils.js
│   │       ├── mathUtils.js
│   │       └── performanceUtils.js
│   │
│   ├── models/                    # Modèles de données (Data Layer)
│   │   ├── index.js              # Export des modèles
│   │   ├── User.js               # Modèle utilisateur
│   │   ├── Project.js            # Modèle projet
│   │   ├── Package.js            # Modèle colis
│   │   ├── Container.js          # Modèle conteneur
│   │   └── OptimizationResult.js # Modèle résultat
│   │
│   ├── repositories/              # Couche d'accès aux données
│   │   ├── baseRepository.js     # Repository de base
│   │   ├── projectRepository.js  # Repository projets
│   │   ├── packageRepository.js  # Repository colis
│   │   ├── containerRepository.js # Repository conteneurs
│   │   └── userRepository.js     # Repository utilisateurs
│   │
│   ├── utils/                     # Utilitaires généraux
│   │   ├── logger.js             # Configuration Winston
│   │   ├── validator.js          # Fonctions de validation
│   │   ├── fileUtils.js          # Gestion fichiers
│   │   ├── dateUtils.js          # Utilitaires dates
│   │   └── responseUtils.js      # Formatage réponses API
│   │
│   └── external/                  # Intégrations externes
│       ├── omsClient.js          # Client OMS/Afridoo
│       ├── tmsClient.js          # Client TMS
│       └── webhooks.js           # Gestion webhooks
│
├── tests/                         # Tests
│   ├── unit/                     # Tests unitaires
│   │   ├── services/
│   │   ├── algorithms/
│   │   └── utils/
│   ├── integration/              # Tests d'intégration
│   │   ├── api/
│   │   └── database/
│   └── fixtures/                 # Données de test
│       ├── projects.json
│       ├── packages.json
│       └── containers.json
│
├── docs/                          # Documentation
│   ├── api/                      # Documentation API
│   │   ├── openapi.yml
│   │   └── postman_collection.json
│   ├── algorithms/               # Doc algorithmes
│   └── deployment/               # Doc déploiement
│
└── scripts/                       # Scripts utilitaires
    ├── seed-database.js          # Peuplement BDD
    ├── migrate.js                # Migrations
    └── backup.js                 # Sauvegarde
```

### 1.2 Structure Frontend (Angular)

```
aide-chargement-frontend/
│
├── package.json
├── package-lock.json
├── angular.json
├── tsconfig.json
├── .gitignore
├── README.md
├── Dockerfile
│
├── src/
│   │
│   ├── main.ts                    # Point d'entrée Angular
│   ├── index.html                # Page HTML principale
│   ├── styles.scss               # Styles globaux
│   │
│   ├── app/                       # Application principale
│   │   ├── app.module.ts         # Module racine
│   │   ├── app.component.ts      # Composant racine
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app-routing.module.ts # Configuration des routes
│   │   │
│   │   ├── core/                  # Services centraux et singletons
│   │   │   ├── core.module.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── api.service.ts
│   │   │   │   ├── cache.service.ts
│   │   │   │   └── notification.service.ts
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── role.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   ├── error.interceptor.ts
│   │   │   │   └── loading.interceptor.ts
│   │   │   └── models/
│   │   │       ├── user.model.ts
│   │   │       ├── api-response.model.ts
│   │   │       └── error.model.ts
│   │   │
│   │   ├── shared/                # Composants et services partagés
│   │   │   ├── shared.module.ts
│   │   │   ├── components/
│   │   │   │   ├── header/
│   │   │   │   │   ├── header.component.ts
│   │   │   │   │   ├── header.component.html
│   │   │   │   │   └── header.component.scss
│   │   │   │   ├── sidebar/
│   │   │   │   ├── loading-spinner/
│   │   │   │   ├── confirmation-dialog/
│   │   │   │   └── data-table/
│   │   │   ├── pipes/
│   │   │   │   ├── file-size.pipe.ts
│   │   │   │   ├── date-format.pipe.ts
│   │   │   │   └── percentage.pipe.ts
│   │   │   ├── directives/
│   │   │   │   ├── tooltip.directive.ts
│   │   │   │   └── highlight.directive.ts
│   │   │   └── utils/
│   │   │       ├── validators.ts
│   │   │       ├── helpers.ts
│   │   │       └── constants.ts
│   │   │
│   │   ├── features/               # Modules fonctionnels
│   │   │   │
│   │   │   ├── auth/              # Module authentification
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth-routing.module.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── logout/
│   │   │   │   └── services/
│   │   │   │       └── auth-api.service.ts
│   │   │   │
│   │   │   ├── projects/          # Module gestion projets
│   │   │   │   ├── projects.module.ts
│   │   │   │   ├── projects-routing.module.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── project-list/
│   │   │   │   │   │   ├── project-list.component.ts
│   │   │   │   │   │   ├── project-list.component.html
│   │   │   │   │   │   └── project-list.component.scss
│   │   │   │   │   ├── project-detail/
│   │   │   │   │   ├── project-form/
│   │   │   │   │   └── project-card/
│   │   │   │   ├── models/
│   │   │   │   │   ├── project.model.ts
│   │   │   │   │   └── project-settings.model.ts
│   │   │   │   └── services/
│   │   │   │       └── project.service.ts
│   │   │   │
│   │   │   ├── packages/           # Module gestion colis
│   │   │   │   ├── packages.module.ts
│   │   │   │   ├── packages-routing.module.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── package-list/
│   │   │   │   │   ├── package-form/
│   │   │   │   │   ├── package-import/
│   │   │   │   │   └── package-detail/
│   │   │   │   ├── models/
│   │   │   │   │   ├── package.model.ts
│   │   │   │   │   └── package-constraints.model.ts
│   │   │   │   └── services/
│   │   │   │       └── package.service.ts
│   │   │   │
│   │   │   ├── containers/         # Module gestion conteneurs
│   │   │   │   ├── containers.module.ts
│   │   │   │   ├── containers-routing.module.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── container-list/
│   │   │   │   │   ├── container-selector/
│   │   │   │   │   ├── container-form/
│   │   │   │   │   └── container-comparison/
│   │   │   │   ├── models/
│   │   │   │   │   └── container.model.ts
│   │   │   │   └── services/
│   │   │   │       └── container.service.ts
│   │   │   │
│   │   │   ├── optimization/       # Module calculs d'optimisation
│   │   │   │   ├── optimization.module.ts
│   │   │   │   ├── optimization-routing.module.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── optimization-config/
│   │   │   │   │   ├── optimization-results/
│   │   │   │   │   ├── optimization-comparison/
│   │   │   │   │   └── optimization-history/
│   │   │   │   ├── models/
│   │   │   │   │   ├── optimization-config.model.ts
│   │   │   │   │   └── optimization-result.model.ts
│   │   │   │   └── services/
│   │   │   │       └── optimization.service.ts
│   │   │   │
│   │   │   ├── visualization/      # Module visualisation
│   │   │   │   ├── visualization.module.ts
│   │   │   │   ├── visualization-routing.module.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── visualization-2d/
│   │   │   │   │   ├── visualization-3d/
│   │   │   │   │   ├── package-placement/
│   │   │   │   │   └── container-view/
│   │   │   │   ├── models/
│   │   │   │   │   └── placement.model.ts
│   │   │   │   └── services/
│   │   │   │       └── visualization.service.ts
│   │   │   │
│   │   │   ├── export/             # Module export
│   │   │   │   ├── export.module.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── export-pdf/
│   │   │   │   │   ├── export-excel/
│   │   │   │   │   └── export-config/
│   │   │   │   └── services/
│   │   │   │       └── export.service.ts
│   │   │   │
│   │   │   └── dashboard/          # Module tableau de bord
│   │   │       ├── dashboard.module.ts
│   │   │       ├── dashboard-routing.module.ts
│   │   │       ├── components/
│   │   │       │   ├── dashboard-home/
│   │   │       │   ├── project-stats/
│   │   │       │   ├── recent-projects/
│   │   │       │   └── quick-actions/
│   │   │       └── services/
│   │   │           └── dashboard.service.ts
│   │   │
│   │   └── layout/                 # Composants de mise en page
│   │       ├── layout.module.ts
│   │       ├── components/
│   │       │   ├── main-layout/
│   │       │   ├── auth-layout/
│   │       │   ├── breadcrumb/
│   │       │   └── footer/
│   │       └── services/
│   │           └── layout.service.ts
│   │
│   ├── assets/                     # Ressources statiques
│   │   ├── images/
│   │   │   ├── logo.png
│   │   │   ├── icons/
│   │   │   └── illustrations/
│   │   ├── styles/
│   │   │   ├── variables.scss
│   │   │   ├── mixins.scss
│   │   │   └── themes/
│   │   ├── i18n/                  # Internationalisation
│   │   │   ├── en.json
│   │   │   ├── fr.json
│   │   │   └── ar.json
│   │   └── config/
│   │       └── app-config.json
│   │
│   └── environments/               # Configuration environnements
│       ├── environment.ts         # Développement
│       ├── environment.prod.ts    # Production
│       └── environment.staging.ts # Staging
│
├── e2e/                           # Tests end-to-end
│   ├── src/
│   │   ├── app.e2e-spec.ts
│   │   ├── projects/
│   │   └── optimization/
│   └── protractor.conf.js
│
└── docs/                          # Documentation
    ├── user-guide/
    ├── developer-guide/
    └── api-integration/
```

---

## 2. Modèle de Données Simplifié

### 2.1 Schéma MongoDB - Collections Principales

#### Collection: `projects`
```javascript
{
  _id: ObjectId,
  name: String,              // "Commande CLIENT-001"
  description: String,       // Description du projet
  status: String,           // "draft", "calculating", "completed"
  userId: ObjectId,         // Référence utilisateur
  createdAt: Date,
  updatedAt: Date,
  
  // Configuration du projet
  settings: {
    allowRotation: Boolean,     // Autoriser rotation colis
    optimizationGoal: String,   // "volume", "weight", "stability"
    maxWeight: Number,          // Poids max global (kg)
    fragileHandling: Boolean    // Gestion produits fragiles
  },
  
  // Résultats de calcul
  results: {
    totalVolume: Number,       // Volume total colis (m³)
    totalWeight: Number,       // Poids total (kg)
    fillRate: Number,         // Taux de remplissage (%)
    selectedContainer: ObjectId, // Conteneur sélectionné
    calculationTime: Number,   // Temps de calcul (ms)
    
    // Position des colis dans le conteneur
    placements: [{
      packageId: ObjectId,
      position: { x: Number, y: Number, z: Number },
      dimensions: { length: Number, width: Number, height: Number },
      rotation: String,       // "none", "90x", "90y", "90z"
      order: Number          // Ordre de placement
    }]
  }
}
```

#### Collection: `packages`
```javascript
{
  _id: ObjectId,
  projectId: ObjectId,      // Référence au projet
  
  // Informations produit
  sku: String,              // Code produit
  name: String,             // Nom du produit
  description: String,
  
  // Dimensions physiques
  length: Number,           // Longueur (cm)
  width: Number,            // Largeur (cm)
  height: Number,           // Hauteur (cm)
  weight: Number,           // Poids (kg)
  volume: Number,           // Volume calculé (cm³)
  
  // Contraintes
  fragile: Boolean,         // Produit fragile
  canRotate: Boolean,       // Rotation autorisée
  stackable: Boolean,       // Empilable
  maxStack: Number,         // Nb max d'empilement
  
  quantity: Number,         // Quantité de colis identiques
  
  // Intégration OMS
  orderId: String,          // ID commande OMS
  priority: Number,         // Priorité (1=urgent, 5=normal)
  
  createdAt: Date,
  updatedAt: Date
}
```

#### Collection: `containers`
```javascript
{
  _id: ObjectId,
  
  // Informations conteneur
  type: String,             // "truck", "container", "van"
  name: String,             // "Camion 20T", "Conteneur 20'"
  code: String,             // Code standardisé
  
  // Dimensions intérieures
  length: Number,           // Longueur (cm)
  width: Number,            // Largeur (cm)  
  height: Number,           // Hauteur (cm)
  volume: Number,           // Volume total (m³)
  
  // Capacités
  maxWeight: Number,        // Poids max (kg)
  tareWeight: Number,       // Poids à vide (kg)
  
  // Coûts
  baseRate: Number,         // Tarif de base
  currency: String,         // "EUR", "USD", "XOF"
  
  active: Boolean,          // Conteneur actif
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2 Structure Redis - Cache Simplifié

```javascript
// Cache des résultats de calcul
"calc:{projectId}:{hash}" => {
  result: Object,
  timestamp: Number,
  ttl: 3600 // 1 heure
}

// Cache des conteneurs actifs
"containers:active" => [...containers]

// Sessions utilisateur
"session:{userId}" => {
  currentProject: String,
  lastActivity: Number
}
```

---

## 3. Stack Technologique Simplifiée

### 3.1 Backend
- **Runtime** : Node.js 18+
- **Framework** : Express.js
- **Base de données** : MongoDB avec Mongoose
- **Cache** : Redis
- **Authentification** : JWT (jsonwebtoken)
- **Validation** : Joi
- **Tests** : Jest + Supertest
- **Documentation** : Swagger/OpenAPI

### 3.2 Frontend
- **Framework** : Angular 15+
- **UI Library** : Angular Material
- **Visualisation** : Chart.js (2D) + Three.js (3D future)
- **HTTP Client** : Angular HttpClient
- **State Management** : Services Angular (simple)
- **Tests** : Jasmine + Karma

### 3.3 DevOps
- **Containerisation** : Docker + Docker Compose
- **CI/CD** : GitHub Actions ou GitLab CI
- **Monitoring** : Simple logging (Winston + console)
- **Déploiement** : VPS ou cloud simple

---

**Contributeur :** Balla GNINGUE - Architecte Logiciel  
**Date :** Semaine 2  
**Version :** 2.1 - Architecture Simplifiée