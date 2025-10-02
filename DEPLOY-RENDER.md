# Configuration de Déploiement Render

## Variables d'environnement requises sur Render

1. **MONGO_URI** - URL de connexion MongoDB (ex: mongodb+srv://...)
2. **JWT_SECRET** - Clé secrète pour JWT (générer une chaîne aléatoire sécurisée)
3. **FRONTEND_URL** - URL de votre frontend déployé
4. **PORT** - Port d'écoute (automatiquement défini par Render à 10000)
5. **NODE_ENV** - Déjà défini à "production"

## Étapes de configuration sur Render

1. Connectez votre dépôt GitHub
2. Sélectionnez "Web Service"
3. Configuration automatique détectée via `package.json`
4. Ajoutez les variables d'environnement dans l'onglet "Environment"

## Notes importantes

- Le serveur écoute sur le port défini par `process.env.PORT`
- Route de santé disponible sur `/health` et `/api/health`
- MongoDB Atlas recommandé pour la base de données
- Les logs sont configurés avec Winston et Morgan

## Commandes de déploiement

- **Build Command**: `npm install` (défini dans package.json)
- **Start Command**: `npm start` (défini dans package.json)

## Dépannage

Si le déploiement échoue :

1. Vérifiez que toutes les variables d'environnement sont définies
2. Vérifiez la connexion MongoDB
3. Consultez les logs Render pour les erreurs spécifiques
4. La route `/health` doit répondre avec un status 200