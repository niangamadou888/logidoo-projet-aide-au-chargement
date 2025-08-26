# Résumé de l'Implémentation de la Simulation d'Aide au Chargement

## Architecture Générale

La simulation est implémentée selon une architecture client-serveur:
1. **Backend** (Node.js/Express): Contient la logique d'optimisation du chargement
2. **Frontend** (Angular): Interface utilisateur pour configurer et visualiser la simulation

## Modèles de Données

### Colis (`backend/src/models/Colis.js`)
- Définit les propriétés d'un colis: dimensions (longueur/largeur/hauteur), poids, quantité
- Inclut des contraintes spéciales:
  - **fragile**: ne peut rien avoir au-dessus
  - **gerbable**: peut avoir des colis dessus

### Contenant (`backend/src/models/Contenant.js`)
- Représente les conteneurs/camions disponibles
- Définit les dimensions, volume, capacité de poids
- Catégorisé en "camion" ou "conteneur"

### Simulation (`backend/src/models/Simulation.js`)
- Stocke les résultats d'une simulation complète
- Inclut la liste des colis, leur placement dans les contenants, et les statistiques

## Services de Simulation (Backend)

### `optimizedSimulationService.js` (principal)
- Contient l'algorithme avancé d'optimisation du chargement
- Fonctions principales:
  - `simulateOptimalPlacement`: Place les colis dans des conteneurs en considérant toutes les contraintes
  - `findOptimalContainer`: Trouve le conteneur optimal pour une liste de colis donnée
  - `evaluateContainerFit`: Évalue la qualité d'adaptation d'un conteneur pour des colis spécifiques
  - `canPlaceInOpenContainer`: Vérifie si un colis peut être placé dans un conteneur en tenant compte des contraintes
  - `itemRotationsFit`: Vérifie si un objet peut être placé dans un conteneur selon différentes rotations

### `simulationService.js` (version simplifiée)
- Implémentation plus basique de l'algorithme de simulation
- Utilisé pour des aperçus rapides ou des systèmes moins complexes

## Algorithme d'Optimisation

L'algorithme principal suit ces étapes:

### 1. Prétraitement
- Les colis sont triés par priorité:
  - D'abord les non-fragiles (les fragiles sont placés en dernier)
  - Ensuite par non-gerbabilité (les non-gerbables d'abord)
  - Puis par volume décroissant (plus grands objets d'abord)
- Les quantités multiples sont décomposées en colis individuels

### 2. Sélection du conteneur
- Pour chaque conteneur disponible, l'algorithme évalue sa capacité à contenir les colis
- Calcul d'un score d'optimalité basé sur:
  - Utilisation du volume (70% du score)
  - Utilisation du poids (30% du score)
  - Taux de placement des colis

### 3. Placement des colis
- Les colis sont placés un par un en respectant:
  - Les contraintes de dimensions (avec rotation possible des colis - 6 orientations)
  - Les contraintes de poids et de volume
  - Les contraintes spéciales (fragile/gerbable)
  - L'espace au sol utilisé (pour les colis non gerbables)

### 4. Évaluation des résultats
- Calcul des statistiques d'utilisation (volume, poids)
- Identification des colis non placés et raisons de non-placement (dimensions trop grandes, poids dépassé, etc.)

## Routes API (Backend)

Le fichier `simulationRoutes.js` expose plusieurs endpoints:
- `/simulations/preview`: Calcule un aperçu du placement optimal
- `/simulations/optimal-container`: Trouve le meilleur conteneur pour des colis donnés
- `/simulations/save`: Enregistre les résultats d'une simulation
- `/simulations/user`: Récupère l'historique des simulations d'un utilisateur

## Interface Frontend

Le composant `SimulationComponent` gère l'interface utilisateur de la simulation:

### Fonctionnalités
1. **Gestion des colis**
   - Ajout manuel de colis avec formulaire
   - Import de colis depuis un fichier CSV
   - Gestion des contraintes (fragile, gerbable)

2. **Sélection du contenant**
   - Mode automatique: recherche du conteneur optimal
   - Mode manuel: sélection par l'utilisateur

3. **Exécution et visualisation**
   - Lancement de la simulation
   - Affichage des statistiques d'utilisation
   - Liste des colis placés et non placés
   - Sauvegarde des résultats

## Points Techniques Clés

### Optimisation du chargement
- Algorithme de type "First Fit Decreasing" modifié pour les contraintes spéciales
- Prise en compte des rotations possibles des colis (6 orientations)
- Gestion des contraintes de fragilité et gerbabilité

### Métriques de performance
- Mesure du temps d'exécution des simulations
- Calcul du taux d'utilisation du volume et du poids

### Intégration backend/frontend
- Service Angular `SimulationService` pour communiquer avec l'API
- Interfaces TypeScript pour les résultats de simulation

## Conclusion

L'implémentation offre une solution complète pour l'aide au chargement qui prend en compte des contraintes complexes comme la fragilité des colis et la possibilité de gerber. L'algorithme d'optimisation cherche à maximiser l'utilisation des contenants tout en respectant les contraintes physiques et logistiques.
