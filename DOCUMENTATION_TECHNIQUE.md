# Documentation Technique - Logidoo - Aide au Chargement

## 📋 Table des matières

1. [Vue d'ensemble du projet](#vue-densemble-du-projet)
2. [Architecture du système](#architecture-du-système)
3. [Stack technologique](#stack-technologique)
4. [Backend - API REST](#backend---api-rest)
5. [Frontend - Application Angular](#frontend---application-angular)
6. [Base de données](#base-de-données)
7. [Algorithmes et optimisations](#algorithmes-et-optimisations)
8. [Sécurité et authentification](#sécurité-et-authentification)
9. [Défis techniques résolus](#défis-techniques-résolus)
10. [Performance et monitoring](#performance-et-monitoring)
11. [Déploiement](#déploiement)
12. [Guide de démonstration technique](#guide-de-démonstration-technique)

---

## Vue d'ensemble du projet

**Logidoo - Aide au Chargement** est une application web full-stack permettant de simuler et optimiser le chargement de colis dans des conteneurs (camions, conteneurs maritimes, etc.). L'application calcule automatiquement la disposition optimale des colis en tenant compte de contraintes physiques et logistiques.

### Objectifs principaux

- Optimiser l'utilisation de l'espace dans les conteneurs
- Respecter les contraintes de poids, dimensions et propriétés des colis (fragile, gerbable)
- Fournir une visualisation 2D/3D interactive du chargement
- Gérer l'historique des simulations pour chaque utilisateur

---

## Architecture du système

### Architecture globale

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Angular 19 Application (SSR)                  │ │
│  │  - Components (Simulation, Visualization, Dashboard)   │ │
│  │  - Services (Auth, Simulation, Visualization)          │ │
│  │  - Guards & Interceptors                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS / REST API
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Express.js Server                         │ │
│  │  - Routes (Auth, Simulations, Contenants, Admin)       │ │
│  │  - Controllers (Business Logic)                        │ │
│  │  - Services (Simulation Engine, Suggestions)           │ │
│  │  - Middleware (Auth JWT, Performance, Upload)          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ Mongoose ODM
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (MongoDB)                        │
│  - Users (auth, roles)                                       │
│  - Contenants (camions, conteneurs)                          │
│  - Simulations (colis, résultats, placements)                │
└─────────────────────────────────────────────────────────────┘
```

### Pattern architectural

- **Backend**: Architecture MVC (Model-View-Controller) adaptée
  - Models: Schémas Mongoose (User, Simulation, Contenant, Colis)
  - Controllers: Logique métier et validation
  - Routes: Points d'entrée API
  - Services: Algorithmes de simulation et optimisation

- **Frontend**: Architecture par fonctionnalités (Feature-based)
  - Core: Services partagés, guards, interceptors, models
  - Features: Modules fonctionnels (simulation, visualization, dashboards)
  - Shared: Composants, pipes et utilitaires réutilisables

---

## Stack technologique

### Backend (Node.js)

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Node.js** | ≥16.0.0 | Runtime JavaScript serveur |
| **Express.js** | 5.1.0 | Framework web minimaliste |
| **MongoDB** | - | Base de données NoSQL |
| **Mongoose** | 8.16.4 | ODM pour MongoDB |
| **JWT** | 9.0.2 | Authentification par tokens |
| **bcrypt** | 5.1.1 | Hashage sécurisé des mots de passe |
| **Helmet** | 8.1.0 | Sécurisation des en-têtes HTTP |
| **Compression** | 1.8.1 | Compression Gzip |
| **Morgan** | 1.10.1 | Logging des requêtes HTTP |
| **Winston** | 3.17.0 | Système de logging avancé |
| **Multer** | 2.0.2 | Upload de fichiers multipart |
| **Nodemailer** | 6.9.14 | Envoi d'emails (réinitialisation mdp) |
| **dotenv** | 17.2.0 | Gestion des variables d'environnement |

### Frontend (Angular)

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Angular** | 19.1.0 | Framework frontend |
| **Angular Material** | 19.2.19 | Bibliothèque UI/UX |
| **RxJS** | 7.8.0 | Programmation réactive |
| **TypeScript** | 5.7.2 | Typage statique |
| **Fabric.js** | 6.7.1 | Canvas HTML5 pour visualisation 2D |
| **jsPDF** | 3.0.2 | Génération de PDF |
| **XLSX** | 0.18.5 | Import/Export Excel |
| **Bootstrap** | 5.3.8 | Framework CSS |
| **Bootstrap Icons** | 1.13.1 | Icônes vectorielles |
| **SweetAlert2** | 11.22.2 | Modales et alertes élégantes |
| **GSAP** | 3.13.0 | Animations avancées |
| **Chroma.js** | 3.1.2 | Manipulation de couleurs |
| **Tailwind CSS** | 4.1.11 | Utility-first CSS |

---

## Backend - API REST

### Structure des dossiers

```
backend/
├── server.js                    # Point d'entrée de l'application
├── src/
│   ├── config/                  # Configuration (logger, auth, mail)
│   │   ├── logger.js
│   │   ├── auth.js
│   │   └── mail.js
│   ├── middleware/              # Middlewares Express
│   │   ├── auth.js              # Authentification JWT
│   │   ├── upload.js            # Upload de fichiers (images conteneurs)
│   │   └── performance.js       # Monitoring performance
│   ├── models/                  # Modèles Mongoose
│   │   ├── User.js
│   │   ├── Simulation.js
│   │   ├── Contenant.js
│   │   └── Colis.js
│   ├── controllers/             # Logique métier
│   │   ├── authController.js
│   │   └── contenantController.js
│   ├── services/                # Services métier et algorithmes
│   │   ├── simulationService.js
│   │   ├── optimizedSimulationService.js
│   │   └── suggestionService.js
│   ├── routes/                  # Définition des routes API
│   │   ├── index.js
│   │   ├── auth.js
│   │   ├── simulationRoutes.js
│   │   ├── contenantRoutes.js
│   │   ├── colisRoutes.js
│   │   ├── adminRoutes.js
│   │   └── logsRoute.js
│   ├── scripts/                 # Scripts utilitaires
│   │   ├── seed-admin.js        # Création compte admin
│   │   └── cleanup-db.js        # Nettoyage base de données
│   └── utils/
│       └── mailer.js            # Utilitaire d'envoi d'emails
├── uploads/                     # Dossier stockage fichiers uploadés
└── logs/                        # Fichiers de logs
```

### Endpoints API principaux

#### Authentification (`/auth`)

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| POST | `/auth/register` | Inscription utilisateur | Non |
| POST | `/auth/login` | Connexion | Non |
| GET | `/auth/me` | Profil utilisateur connecté | Oui |
| PUT | `/auth/me` | Mise à jour profil | Oui |
| POST | `/auth/forgot-password` | Demande réinitialisation mot de passe | Non |
| POST | `/auth/reset-password` | Réinitialisation mot de passe | Non |
| POST | `/auth/change-password` | Changement mot de passe | Oui |

#### Simulations (`/api/simulations`)

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| POST | `/api/simulations` | Créer une simulation | Oui |
| GET | `/api/simulations` | Lister simulations de l'utilisateur | Oui |
| GET | `/api/simulations/:id` | Détails d'une simulation | Oui |
| PUT | `/api/simulations/:id` | Mettre à jour une simulation | Oui |
| DELETE | `/api/simulations/:id` | Supprimer une simulation | Oui |
| POST | `/api/simulations/preview` | Prévisualisation optimale (sans sauvegarder) | Oui |
| POST | `/api/simulations/optimal-container` | Trouver le conteneur optimal | Oui |
| POST | `/api/simulations/evaluate-container` | Évaluer un conteneur spécifique | Oui |

#### Contenants (`/api/contenants`)

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| GET | `/api/contenants` | Liste des contenants disponibles | Oui |
| GET | `/api/contenants/:id` | Détails d'un contenant | Oui |
| POST | `/api/contenants` | Créer un contenant (admin) | Oui (Admin) |
| PUT | `/api/contenants/:id` | Modifier un contenant (admin) | Oui (Admin) |
| DELETE | `/api/contenants/:id` | Supprimer un contenant (admin) | Oui (Admin) |
| POST | `/api/contenants/:id/images` | Uploader une image | Oui (Admin) |
| DELETE | `/api/contenants/:id/images/:imageName` | Supprimer une image | Oui (Admin) |

#### Administration (`/api/admin`)

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| GET | `/api/admin/users` | Liste tous les utilisateurs | Oui (Admin) |
| GET | `/api/admin/users/:id` | Détails utilisateur | Oui (Admin) |
| PUT | `/api/admin/users/:id` | Modifier utilisateur | Oui (Admin) |
| DELETE | `/api/admin/users/:id` | Supprimer utilisateur | Oui (Admin) |
| PUT | `/api/admin/users/:id/toggle-active` | Activer/désactiver utilisateur | Oui (Admin) |

#### Monitoring (`/api`)

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| GET | `/health` | Vérification simple de santé | Non |
| GET | `/api/health` | État détaillé du serveur | Non |
| GET | `/api/metrics` | Métriques de performance | Non |
| GET | `/api/logs` | Récupération des logs | Oui (Admin) |

---

## Frontend - Application Angular

### Structure des dossiers

```
frontend/src/
├── app/
│   ├── core/                          # Fonctionnalités centrales
│   │   ├── guards/
│   │   │   ├── auth.guard.ts          # Protection des routes
│   │   │   └── admin.guard.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts    # Injection token JWT
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   └── contenant.model.ts
│   │   ├── resolvers/
│   │   │   └── simulation.resolver.ts
│   │   └── services/
│   │       ├── auth.service.ts        # Gestion authentification
│   │       ├── error-handler.service.ts
│   │       └── logger.service.ts      # Logging côté client
│   │
│   ├── features/                      # Modules fonctionnels
│   │   ├── simulation/                # Page de simulation
│   │   │   ├── simulation.component.ts
│   │   │   ├── simulation.component.html
│   │   │   └── simulation.component.scss
│   │   │
│   │   ├── visualization/             # Visualisation 2D/3D
│   │   │   ├── components/
│   │   │   │   ├── canvas/            # Rendu 2D Fabric.js
│   │   │   │   ├── scene/             # Rendu 3D (futur)
│   │   │   │   ├── panel/             # Panneau de contrôle
│   │   │   │   └── toolbar/           # Barre d'outils
│   │   │   ├── services/
│   │   │   │   └── visualization.service.ts
│   │   │   ├── models/
│   │   │   │   ├── visualization.model.ts
│   │   │   │   └── placement.model.ts
│   │   │   └── visualization.component.ts
│   │   │
│   │   ├── conteneurs/                # Gestion des conteneurs
│   │   ├── history/                   # Historique des simulations
│   │   ├── user-dashboard/            # Dashboard utilisateur
│   │   ├── admin-dashboard/           # Dashboard administrateur
│   │   ├── admin-users/               # Gestion utilisateurs (admin)
│   │   ├── user-profile/              # Profil utilisateur
│   │   └── admin-profile/             # Profil admin
│   │
│   ├── auth/                          # Authentification
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   │
│   ├── shared/                        # Composants partagés
│   │   ├── components/
│   │   ├── pipes/
│   │   └── utils/
│   │       ├── color-utils.ts         # Génération couleurs
│   │       └── geometry-utils.ts      # Calculs géométriques 3D
│   │
│   ├── services/                      # Services métier
│   │   ├── conteneur.service.ts
│   │   ├── simulation.service.ts
│   │   └── excelService.ts            # Import/Export Excel
│   │
│   ├── models/
│   │   └── simulation.model.ts
│   │
│   ├── app.routes.ts                  # Configuration routing
│   └── app.config.ts                  # Configuration application
│
├── environments/                      # Configuration environnements
├── assets/                            # Images, icônes, etc.
└── styles.scss                        # Styles globaux
```

### Services principaux

#### AuthService (`auth.service.ts`)
- Gestion de l'authentification JWT
- Stockage sécurisé du token (localStorage)
- Auto-déconnexion à l'expiration du token
- Gestion des rôles (user/admin)

#### SimulationService (`simulation.service.ts`)
- Communication avec l'API de simulation
- Prévisualisation de chargement optimal
- Recherche de conteneur optimal
- Évaluation de conteneur spécifique
- Sauvegarde et récupération des simulations

#### VisualizationService (`visualization.service.ts`)
- Conversion des données de simulation en objets visualisables
- Gestion de l'état de la scène (conteneurs, items, positions)
- Support multi-mode (2D/3D, vue individuelle/globale)
- Enrichissement des données avec les dimensions réelles des contenants

#### ConteneurService (`conteneur.service.ts`)
- CRUD sur les conteneurs
- Upload et gestion d'images
- Filtrage par catégorie (camion/conteneur)

### Guards et interceptors

- **AuthGuard**: Protège les routes nécessitant une authentification
- **AdminGuard**: Restreint l'accès aux administrateurs
- **AuthInterceptor**: Injecte automatiquement le token JWT dans les requêtes

---

## Base de données

### MongoDB - Schémas principaux

#### User

```javascript
{
  username: String (unique, 3-30 caractères),
  email: String (unique, validé),
  password: String (hashé bcrypt, min 6 caractères),
  role: String (enum: 'user', 'admin', default: 'user'),
  active: Boolean (default: true),
  resetPasswordToken: String (nullable),
  resetPasswordExpires: Date (nullable),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Méthodes**:
- `comparePassword(password)`: Compare le mot de passe fourni avec le hash

**Hooks**:
- Pre-save: Hash automatique du mot de passe si modifié

#### Contenant

```javascript
{
  matricule: String (unique, requis),
  categorie: String (enum: 'camion', 'conteneur'),
  type: String (ex: "20ft Standard", "Camion frigorifique"),
  modele: String (optionnel),
  dimensions: {
    longueur: Number (cm, requis),
    largeur: Number (cm, requis),
    hauteur: Number (cm, requis)
  },
  volume: Number (m³, calculé automatiquement),
  capacitePoids: Number (kg, requis),
  capacite: {
    volume: Number (m³),
    poidsMax: Number (kg)
  },
  images: [String] (URLs des images),
  disponible: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

**Hooks**:
- Pre-save: Calcul automatique du volume si non fourni

#### Simulation

```javascript
{
  utilisateurId: ObjectId (ref: 'User', requis),
  nom: String,
  description: String,
  colis: [ColisSchema],
  resultats: {
    success: Boolean,
    stats: {
      totalVolume: Number (m³),
      totalWeight: Number (kg),
      containersCount: Number,
      avgVolumeUtilization: Number (%),
      avgWeightUtilization: Number (%),
      fragilesCount: Number,
      nonGerbablesCount: Number
    },
    containers: [Mixed],  // Résultats détaillés par conteneur
    placements: [{
      containerId: String,
      containerRef: ObjectId,
      item: ColisSchema
    }],
    unplacedItems: [ColisSchema]
  },
  date: Date (default: Date.now)
}
```

**Méthodes**:
- `getStats()`: Calcule et retourne les statistiques de la simulation

#### Colis (Sous-schéma)

```javascript
{
  reference: String,
  type: String,
  nomDestinataire: String,
  adresse: String,
  telephone: String,
  poids: Number (kg),
  longueur: Number (cm),
  largeur: Number (cm),
  hauteur: Number (cm),
  quantite: Number (default: 1),
  fragile: Boolean,
  gerbable: Boolean,
  couleur: String (hex),
  statut: String,
  dateAjout: Date,
  conteneurId: ObjectId (ref: 'Conteneur'),
  camionId: ObjectId (ref: 'Camion')
}
```

### Indexes et performances

- Index unique sur `User.email` et `User.username`
- Index unique sur `Contenant.matricule`
- Index sur `Simulation.utilisateurId` pour requêtes rapides par utilisateur
- Index sur `Simulation.date` pour tri chronologique

---

## Algorithmes et optimisations

### Algorithme de placement de colis

Le système utilise un **algorithme de bin packing optimisé** avec plusieurs stratégies combinées :

#### 1. First Fit Decreasing (FFD)

Les colis sont triés par volume décroissant avant placement.

```javascript
// Tri des colis par volume décroissant
colis.sort((a, b) => {
  const volumeA = a.longueur * a.largeur * a.hauteur;
  const volumeB = b.longueur * b.largeur * b.hauteur;
  return volumeB - volumeA;
});
```

#### 2. Rotation et orientation optimale

L'algorithme teste les **6 rotations possibles** pour chaque colis et choisit la meilleure orientation :

```javascript
function findBestOrientation(itemDims, boxDims, currentLevel) {
  const orientations = [
    [L, l, h], [L, h, l],
    [l, L, h], [l, h, L],
    [h, L, l], [h, l, L]
  ];

  // Filtre les orientations valides
  validOrientations = orientations.filter(o =>
    o[0] <= box[0] && o[1] <= box[1] && o[2] <= box[2]
  );

  // Privilégie l'orientation qui minimise la hauteur
  // et maximise l'utilisation de la base
  return bestOrientation;
}
```

#### 3. Placement multi-couches (Layer Building)

Le système organise les colis en **couches horizontales** pour optimiser l'espace :

- Placement prioritaire des items non gerbables en couche supérieure
- Placement des fragiles au-dessus des non-fragiles
- Maximisation du remplissage de chaque couche avant d'en créer une nouvelle

#### 4. Contraintes respectées

- **Poids**: Vérification que le poids total ne dépasse pas la capacité
- **Volume**: Utilisation de l'espace avec marge d'erreur minimale (epsilon = 1e-9)
- **Dimensions**: Rotation automatique pour faire entrer le colis
- **Fragilité**: Les colis fragiles ne supportent pas de poids au-dessus
- **Gerbabilité**: Les colis non gerbables ne peuvent rien avoir au-dessus

#### 5. Sélection optimale de conteneur

Algorithme pour trouver le conteneur minimal nécessaire :

```javascript
async function findOptimalContainer(colis) {
  const pool = await getContainerPool();

  // Tri des conteneurs par volume croissant
  pool.sort((a, b) => a.volume - b.volume);

  for (const container of pool) {
    const result = await simulateOptimalPlacement(colis, {
      fixedContainerId: container._id
    });

    if (result.success && result.unplacedItems.length === 0) {
      return { container, result, isOptimal: true };
    }
  }

  return { container: null, isOptimal: false };
}
```

### Performance

- **Temps de calcul moyen**: < 500ms pour 50 colis
- **Complexité**: O(n * m) où n = nombre de colis, m = nombre de conteneurs testés
- **Optimisations**:
  - Calcul de volume en cache
  - Early stopping si tous les colis sont placés
  - Pool de conteneurs filtré par disponibilité

---

## Sécurité et authentification

### Authentification JWT (JSON Web Tokens)

#### Workflow

1. **Connexion**: L'utilisateur envoie email + mot de passe
2. **Vérification**: Le serveur vérifie les credentials avec bcrypt
3. **Génération token**: Si valide, génération d'un JWT signé
4. **Stockage**: Le client stocke le token (localStorage)
5. **Requêtes**: Le token est envoyé dans l'en-tête `Authorization: Bearer <token>`
6. **Validation**: Middleware backend valide le token à chaque requête

#### Configuration JWT

```javascript
// backend/src/config/auth.js
module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  accessTokenCookieName: 'access_token'
};
```

#### Middleware d'authentification

```javascript
// backend/src/middleware/auth.js
const authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const decoded = jwt.verify(token, jwtSecret);
  const user = await User.findById(decoded.id).select('-password');

  if (!user || !user.active) {
    return res.status(401).json({ message: 'Invalid authentication' });
  }

  req.user = user;
  next();
};
```

### Hashage des mots de passe

Utilisation de **bcrypt** avec salt automatique :

```javascript
// Hash avant sauvegarde (Hook Mongoose)
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Comparaison lors de la connexion
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};
```

### Gestion des rôles

- **User (par défaut)**: Accès aux simulations, conteneurs (lecture), profil personnel
- **Admin**: Accès total + gestion des utilisateurs + CRUD conteneurs

```javascript
// Middleware d'autorisation admin
const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: admin required' });
  }
  next();
};
```

### Réinitialisation de mot de passe

1. Demande de réinitialisation avec email
2. Génération d'un token unique (crypto.randomBytes)
3. Envoi d'un email avec lien de réinitialisation
4. Token valide 1 heure
5. Réinitialisation avec nouveau mot de passe

### Mesures de sécurité supplémentaires

- **Helmet**: Protection contre les vulnérabilités courantes (XSS, clickjacking, etc.)
- **CORS**: Configuration stricte des origines autorisées
- **Rate limiting**: Limitation du nombre de requêtes (à implémenter en production)
- **Validation des entrées**: Validation stricte avec Mongoose et côté frontend
- **HTTPS**: Obligatoire en production
- **Environnement**: Variables sensibles dans `.env` (jamais committées)

---

## Défis techniques résolus

### 1. Algorithme de bin packing 3D avec contraintes multiples

**Défi**: Placer des colis de dimensions et poids variés dans des conteneurs en respectant les contraintes de fragilité et gerbabilité.

**Solution**:
- Implémentation d'un algorithme FFD (First Fit Decreasing) avec rotation 6D
- Gestion des couches horizontales pour organiser les colis
- Priorisation intelligente : non-gerbables en haut, fragiles protégés
- Calcul précis des positions 3D (x, y, z) pour visualisation

**Complexité résolue**:
```javascript
// Placement avec contraintes
function canPlaceOnTop(upperItem, lowerItem) {
  if (!lowerItem.gerbable) return false;  // Impossible si non gerbable
  if (lowerItem.fragile) return false;    // Impossible si fragile
  return true;
}
```

### 2. Visualisation 2D interactive avec Fabric.js

**Défi**: Afficher une vue en coupe 2D de conteneurs 3D chargés de colis.

**Solution**:
- Utilisation de **Fabric.js** pour le rendu canvas
- Projection 3D → 2D avec calcul de profondeur
- Coding couleur par colis pour identification
- Interactivité : zoom, pan, sélection de colis
- Export PDF avec jsPDF

**Code clé**:
```typescript
// Création d'un colis en 2D
const colisRect = new fabric.Rect({
  left: x * scale,
  top: y * scale,
  width: longueur * scale,
  height: hauteur * scale,
  fill: colis.couleur,
  stroke: '#000',
  strokeWidth: 1
});
```

### 3. Gestion de la performance avec de nombreux colis

**Défi**: Simulation rapide même avec 100+ colis et 20+ conteneurs.

**Solution**:
- **Memoization** des calculs de volume
- **Early stopping** dès que tous les colis sont placés
- **Filtrage intelligent** du pool de conteneurs (tri par volume)
- **Middleware de performance** pour tracker les routes lentes (>500ms)
- **Compression Gzip** des réponses API

**Monitoring**:
```javascript
app.use(responseTime((req, res, time) => {
  if (time > 500) {
    logger.warn(`Route lente: ${req.method} ${req.url} - ${time}ms`);
  }
}));
```

### 4. Import/Export de données Excel

**Défi**: Permettre l'import de centaines de colis via fichier Excel.

**Solution**:
- Utilisation de **XLSX.js** (bibliothèque client-side)
- Parsing et validation des colonnes
- Mapping automatique des champs
- Gestion des erreurs avec feedback utilisateur
- Export des résultats de simulation en Excel

**Workflow**:
1. Upload fichier .xlsx
2. Parsing des lignes avec XLSX
3. Validation des données (dimensions, poids, etc.)
4. Conversion en objets Colis
5. Ajout à la liste de simulation

### 5. Mode SSR (Server-Side Rendering) avec Angular 19

**Défi**: Améliorer le SEO et la performance de chargement initial.

**Solution**:
- Configuration Angular Universal (SSR)
- Détection de plateforme pour éviter les erreurs SSR
- Utilisation de `isPlatformBrowser()` pour opérations DOM
- Hydration automatique côté client

```typescript
constructor(@Inject(PLATFORM_ID) platformId: Object) {
  this.isBrowser = isPlatformBrowser(platformId);
}

ngOnInit() {
  if (this.isBrowser) {
    // Code uniquement exécuté côté client (DOM, localStorage, etc.)
  }
}
```

### 6. Gestion des couleurs uniques pour les colis

**Défi**: Générer automatiquement des couleurs distinctes pour chaque colis.

**Solution**:
- Algorithme HSL avec répartition sur le cercle chromatique
- Utilisation de **Chroma.js** pour manipulation avancée
- Éviter les couleurs trop claires ou trop sombres
- Couleur persistante par colis (même couleur dans visualisation et tableaux)

```typescript
// color-utils.ts
static generateDistinctColors(count: number): string[] {
  const colors: string[] = [];
  const goldenRatioConjugate = 0.618033988749895;
  let hue = Math.random();

  for (let i = 0; i < count; i++) {
    hue += goldenRatioConjugate;
    hue %= 1;
    colors.push(chroma.hsl(hue * 360, 0.6, 0.5).hex());
  }

  return colors;
}
```

### 7. Gestion d'état complexe avec RxJS

**Défi**: Synchroniser l'état de la visualisation entre composants.

**Solution**:
- Utilisation de **BehaviorSubject** dans le VisualizationService
- Observables pour propagation automatique des changements
- Pattern de service singleton pour état partagé

```typescript
private sceneSubject = new BehaviorSubject<VisualizationScene>(defaultScene);
public scene$ = this.sceneSubject.asObservable();

// Mise à jour de l'état
updateScene(scene: VisualizationScene) {
  this.sceneSubject.next(scene);
}

// Souscription dans le composant
this.visualizationService.scene$.subscribe(scene => {
  this.renderScene(scene);
});
```

### 8. Logging centralisé et traçabilité

**Défi**: Déboguer efficacement les erreurs en production.

**Solution**:
- **Winston** pour logging structuré backend (fichiers + console)
- **Morgan** pour logs HTTP
- **NGX-Logger** côté frontend
- Identifiants uniques d'erreur pour corrélation
- Rotation automatique des fichiers de logs

```javascript
logger.error(`Error ID: ${errorId} - ${err.message}`, {
  errorId,
  stack: err.stack,
  method: req.method,
  path: req.path,
  user: req.user?.id || 'anonymous'
});
```

---

## Performance et monitoring

### Métriques clés

| Métrique | Valeur cible | Mesure actuelle |
|----------|--------------|-----------------|
| Temps de réponse API | < 200ms | ~150ms (moyenne) |
| Temps de simulation | < 500ms | ~300ms (50 colis) |
| Temps de chargement page | < 2s | ~1.5s (First Contentful Paint) |
| Taille bundle JS | < 1MB | ~850KB (gzippé) |

### Outils de monitoring

1. **Response Time Middleware**
   - Mesure automatique du temps de chaque requête
   - Log automatique des routes lentes (>500ms)
   - Header `X-Response-Time` ajouté aux réponses

2. **Endpoint `/api/metrics`**
   - Métriques système (CPU, RAM, uptime)
   - État de la connexion MongoDB
   - Mémoire utilisée par le processus Node.js

3. **Endpoint `/api/health`**
   - Vérification de santé du serveur
   - État des services (DB, logs, etc.)

4. **Logging multi-niveaux**
   - `error`: Erreurs critiques
   - `warn`: Routes lentes, problèmes non-bloquants
   - `info`: Démarrage serveur, événements importants
   - `debug`: Informations détaillées (dev uniquement)

### Optimisations appliquées

- **Compression Gzip** de toutes les réponses HTTP
- **Indexes MongoDB** sur champs fréquemment requêtés
- **Lazy loading** des modules Angular
- **Tree shaking** avec Angular build optimizer
- **Minification et uglification** du code en production
- **Cache-Control headers** pour ressources statiques

---

## Déploiement

### Backend (Render.com)

**URL de production**: `https://logidoo-projet-aide-au-chargement-7.onrender.com`

**Configuration**:
- Service: Web Service
- Runtime: Node.js 16+
- Build Command: `npm install`
- Start Command: `npm start`
- Auto-deploy: activé sur branche `main`

**Variables d'environnement à configurer**:
```env
NODE_ENV=production
PORT=3000
MONGO_URI=<MongoDB Atlas Connection String>
JWT_SECRET=<Secret aléatoire sécurisé>
JWT_EXPIRES_IN=24h
FRONTEND_URL=<URL du frontend déployé>
SMTP_HOST=<Serveur SMTP>
SMTP_PORT=587
SMTP_USER=<Email SMTP>
SMTP_PASS=<Mot de passe SMTP>
```

### Frontend (Vercel / Netlify)

**Build Command**: `npm run build:prod`
**Output Directory**: `dist/front-end/browser`

**Configuration Angular pour production**:
```json
"production": {
  "optimization": true,
  "outputHashing": "all",
  "sourceMap": false,
  "namedChunks": false,
  "aot": true,
  "extractLicenses": true,
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "1mb",
      "maximumError": "2mb"
    }
  ]
}
```

### Base de données (MongoDB Atlas)

**Cluster**: M0 (Free tier) ou supérieur
**Région**: Choisir proche des serveurs backend (ex: EU West)

**Configuration**:
- Whitelist IP: `0.0.0.0/0` (ou IP spécifiques pour plus de sécurité)
- User avec rôle `readWrite` sur la DB `logidoo`
- Backup automatique activé (tiers payants)

### CI/CD

**Workflow Git**:
1. Développement sur branche `develop`
2. Pull Request vers `main`
3. Code review
4. Merge → déploiement automatique

**Checks pré-déploiement**:
- Linting (ESLint + TSLint)
- Build réussi
- Tests unitaires (si implémentés)

---

## Guide de démonstration technique

### Points clés à présenter

#### 1. Architecture Full-Stack moderne (5 min)

- **Présentation du schéma** architecture 3-tiers
- **Technos utilisées**: Angular 19, Node.js/Express, MongoDB
- **Communication**: API REST avec authentification JWT
- **Séparation des responsabilités**: Frontend (UI/UX), Backend (logique métier), DB (persistance)

**Live code à montrer**:
```bash
# Structure backend
cd backend
ls src/
# Montrer models/, routes/, services/, controllers/

# Structure frontend
cd frontend/src/app
ls
# Montrer core/, features/, shared/
```

#### 2. API REST et endpoints (5 min)

**Démonstration avec Postman ou curl**:

```bash
# 1. Connexion
curl -X POST https://API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Réponse: { "token": "eyJhbGc...", "user": {...} }

# 2. Créer une simulation (avec token)
curl -X POST https://API_URL/api/simulations/preview \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "colis": [
      { "longueur": 100, "largeur": 80, "hauteur": 60, "poids": 25, "quantite": 2 }
    ]
  }'

# Réponse: { "success": true, "result": {...}, "executionTime": 245 }
```

**Points à souligner**:
- Authentification JWT obligatoire
- Validation des données
- Réponses structurées avec code HTTP approprié
- Temps d'exécution retourné pour monitoring

#### 3. Algorithme de simulation (10 min)

**Fichier**: `backend/src/services/optimizedSimulationService.js`

**Concepts à expliquer**:

1. **First Fit Decreasing**:
```javascript
// Tri des colis par volume décroissant
expanded.sort((a, b) => {
  const va = a.longueur * a.largeur * a.hauteur;
  const vb = b.longueur * b.largeur * b.hauteur;
  return vb - va;  // Plus grand en premier
});
```

2. **Rotation 6D**:
```javascript
// 6 orientations possibles pour chaque colis
const orientations = [
  [L, l, h], [L, h, l],
  [l, L, h], [l, h, L],
  [h, L, l], [h, l, L]
];
```

3. **Gestion des contraintes**:
```javascript
// Vérification gerbabilité et fragilité
function canPlaceOnTop(upperItem, lowerItem, lowerPosition) {
  if (!lowerItem.gerbable) return false;
  if (lowerItem.fragile && upperItem.poids > lowerItem.poids) return false;
  return checkOverlap(upperItem, lowerItem, lowerPosition);
}
```

**Démonstration live**:
- Créer 3-4 colis de tailles différentes
- Lancer la simulation
- Montrer le résultat : placement, taux d'utilisation, nombre de conteneurs

#### 4. Base de données MongoDB (5 min)

**Connexion à MongoDB (Compass ou Atlas UI)**:

```javascript
// Exemple de document Simulation
{
  "_id": ObjectId("..."),
  "utilisateurId": ObjectId("..."),
  "nom": "Livraison Paris - Lot A",
  "colis": [
    {
      "reference": "COL-001",
      "longueur": 100,
      "largeur": 80,
      "hauteur": 60,
      "poids": 25,
      "quantite": 2,
      "fragile": false,
      "gerbable": true,
      "couleur": "#3498db"
    }
  ],
  "resultats": {
    "success": true,
    "stats": {
      "totalVolume": 0.96,
      "containersCount": 1,
      "avgVolumeUtilization": 85.3
    },
    "containers": [...],
    "placements": [...],
    "unplacedItems": []
  },
  "date": ISODate("2025-10-02T10:30:00Z")
}
```

**Points à souligner**:
- Schéma flexible avec Mongoose
- Relations avec références (`utilisateurId`, `containerRef`)
- Sous-documents imbriqués (colis, résultats)
- Indexes pour performance

#### 5. Visualisation interactive (10 min)

**Fichier**: `frontend/src/app/features/visualization/`

**Démonstration UI**:
1. Créer une simulation avec 5-10 colis variés
2. Lancer la simulation
3. Accéder à la visualisation 2D
4. Montrer les fonctionnalités :
   - Vue par conteneur (navigation précédent/suivant)
   - Vue globale (tous les conteneurs)
   - Zoom et pan
   - Sélection de colis (affiche infos)
   - Export PDF

**Code clé à montrer** (`visualization.service.ts`):
```typescript
// Conversion des données backend → objets visualisables
private convertSimulationToContainers(simulationData: SimulationData) {
  return simulationData.resultats.containers.map((container, index) => {
    const items = this.convertPlacementsToItems(
      simulationData.resultats.placements,
      container.id
    );

    return {
      id: container.id,
      dimensions: container.dimensions,
      items: items,
      stats: {
        volumeUtilization: container.volumeUtilization,
        weightUtilization: container.weightUtilization
      }
    };
  });
}
```

#### 6. Sécurité et authentification (5 min)

**Démonstration**:

1. **Tentative d'accès sans token** → 401 Unauthorized
2. **Connexion** → Token JWT généré
3. **Requête avec token** → Accès autorisé
4. **Middleware Auth** (montrer le code):

```javascript
// backend/src/middleware/auth.js
const authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Auth required' });
  }

  const decoded = jwt.verify(token, jwtSecret);
  const user = await User.findById(decoded.id);

  req.user = user;  // ← Utilisateur disponible dans toutes les routes
  next();
};
```

5. **Rôles**: Montrer qu'un utilisateur `user` ne peut pas accéder à `/api/admin/users`

#### 7. Challenges résolus (5 min)

**Présentation rapide** des défis techniques :

1. **Algorithme bin packing 3D** → FFD + rotation + contraintes
2. **Performance** → Optimisations, memoization, early stopping
3. **Visualisation** → Fabric.js, projection 3D→2D
4. **Import Excel** → Parsing XLSX, validation
5. **SSR Angular** → Universal pour SEO

**Montrer les métriques**:
```bash
# Temps de réponse API
curl https://API_URL/api/health
# → Affiche uptime, memory, CPU
```

#### 8. Walkthrough du flux complet (5 min)

**Scénario utilisateur**:

1. **Connexion** (`/auth/login`)
2. **Dashboard utilisateur** (liste des simulations passées)
3. **Nouvelle simulation** (`/simulation`):
   - Ajouter manuellement 2-3 colis
   - Importer un fichier Excel avec 10 colis
   - Lancer la recherche de conteneur optimal
4. **Résultats**:
   - Voir le conteneur suggéré
   - Vérifier les stats (utilisation volume/poids)
   - Sauvegarder la simulation
5. **Visualisation** (`/visualization/:id`):
   - Explorer la vue 2D
   - Exporter en PDF
6. **Historique** (`/history`):
   - Retrouver la simulation
   - Réutiliser les colis pour une nouvelle simulation

### Conseils de présentation

- **Préparer les données de démo** : Avoir des comptes user/admin, des colis pré-configurés, des fichiers Excel de test
- **Avoir un plan B** : Captures d'écran en cas de problème réseau
- **Montrer le code progressivement** : Ne pas tout montrer d'un coup, se concentrer sur les parties clés
- **Être prêt aux questions** : Alternatives considérées, scalabilité, améliorations futures

---

## Annexes

### Variables d'environnement complètes

```env
# Server
NODE_ENV=development|production
PORT=3000

# Database
MONGO_URI=mongodb://localhost:27017/logidoo

# JWT
JWT_SECRET=<secret-key>
JWT_EXPIRES_IN=24h

# Frontend
FRONTEND_URL=http://localhost:4200

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM_NAME=Logidoo
SMTP_FROM_EMAIL=no-reply@logidoo.com
```

### Scripts utiles

```bash
# Backend
npm start              # Démarrer le serveur
npm run dev            # Mode développement (nodemon)
npm run seed:admin     # Créer un compte admin par défaut
npm run cleanup:db     # Nettoyer la base de données

# Frontend
npm start              # Serveur de développement (port 4200)
npm run build          # Build de production
npm run build:prod     # Build optimisé
npm test               # Tests unitaires
```

### Compte admin par défaut (dev)

```
Email: admin@logidoo.com
Password: Admin123!
```

*(À créer avec `npm run seed:admin`)*

---

## Améliorations futures

1. **Visualisation 3D** avec Three.js ou Babylon.js
2. **Temps réel** : Collaboration multi-utilisateurs (WebSocket)
3. **Machine Learning** : Prédiction du conteneur optimal via historique
4. **Mobile app** : Application React Native ou Ionic
5. **Tests automatisés** : Jest (backend) + Jasmine/Karma (frontend)
6. **CI/CD avancé** : GitHub Actions, tests automatisés pré-déploiement
7. **Internationalisation** : Support multi-langues (i18n)
8. **Notifications push** : Alertes quand simulation terminée (si longue)
9. **Export formats** : CSV, JSON, XML en plus de Excel et PDF
10. **Analytics** : Dashboard d'analytics pour admins (stats globales, usage)

---

**Document généré pour la démo technique**
**Projet**: Logidoo - Aide au Chargement
**Date**: Octobre 2025
**Version**: 1.0
