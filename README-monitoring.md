# Documentation du Système de Monitoring et Logging

Ce document décrit les outils et mécanismes mis en place pour le monitoring, le logging et le débogage de l'application Logidoo.

## Architecture de Logging

### Backend (Node.js/Express)

#### Technologies utilisées:
- **Winston**: Logger principal pour les logs structurés
- **Morgan**: Logging HTTP des requêtes
- **Express Middleware**: Suivi des performances et des erreurs

#### Types de logs:
- **app.log**: Logs généraux de l'application
- **error.log**: Logs d'erreurs uniquement
- **performance.log**: Métriques de performance
- **access.log**: Journal des requêtes HTTP

#### Endpoints de monitoring:
- `/api/health`: État de santé de l'application
- `/api/metrics`: Métriques détaillées de performance
- `/api/logs`: Endpoint pour recevoir et consulter les logs

### Frontend (Angular)

#### Technologies utilisées:
- **ngx-logger**: Logger structuré pour Angular
- **Intercepteurs HTTP**: Suivi des performances et des erreurs HTTP
- **ErrorHandler Global**: Capture et log des erreurs Angular

#### Configuration:
- Les logs côté client sont envoyés au backend via l'endpoint `/api/logs`
- Niveau de log configurable par environnement
- Filtrage des logs sensibles

## Guide d'utilisation

### Consulter les logs

1. **Logs backend**:
   - Accéder au répertoire `backend/logs`
   - Utiliser `tail -f backend/logs/app.log` pour suivre en temps réel
   - Utiliser `grep` pour filtrer les logs: `grep "ERROR" backend/logs/error.log`

2. **Logs frontend**:
   - Les logs frontend sont visibles dans la console du navigateur
   - Les logs critiques sont envoyés au backend et stockés dans les mêmes fichiers

3. **Monitoring en temps réel**:
   - Accéder à `/api/metrics` pour les métriques de performance
   - Accéder à `/api/health` pour le statut de l'application

### Debug des problèmes courants

1. **Erreurs HTTP 5xx**:
   - Consulter `backend/logs/error.log` pour les détails
   - Rechercher l'ID d'erreur indiqué dans la réponse API

2. **Problèmes de performance**:
   - Consulter `backend/logs/performance.log`
   - Utiliser les endpoints de métriques pour isoler les goulots d'étranglement

3. **Problèmes d'authentification**:
   - Vérifier les logs d'erreur pour les tentatives échouées
   - Consulter le statut du serveur d'authentification via `/api/health`

## Tests de Performance et Sécurité

Des checklists détaillées ont été préparées pour les tests de performance et de sécurité:

- **Performance**: Voir `docs/checklist-performance.md`
- **Sécurité**: Voir `docs/checklist-securite.md`

## Journal de Debug

Un journal de debug est maintenu pour documenter les problèmes rencontrés et leurs solutions:

- Voir `docs/journal-debug.md`

## Bonnes Pratiques

1. **Ajouter des logs significatifs**:
   ```javascript
   // ✅ Bon exemple avec contexte
   logger.info('Utilisateur connecté', { userId: user.id, role: user.role });
   
   // ❌ Mauvais exemple sans contexte
   logger.info('Connexion réussie');
   ```

2. **Logger les étapes critiques**:
   - Authentification (succès/échecs)
   - Modifications de données importantes
   - Erreurs système ou applicatives
   - Opérations longues ou coûteuses

3. **Ne pas logger de données sensibles**:
   - Mots de passe
   - Tokens de sécurité
   - Informations personnelles (PII)
   - Données confidentielles

4. **Utiliser les niveaux de log appropriés**:
   - **ERROR**: Erreurs qui empêchent une fonctionnalité
   - **WARN**: Problèmes qui n'empêchent pas le fonctionnement
   - **INFO**: Événements significatifs
   - **DEBUG**: Détails pour le débogage (désactivé en production)
