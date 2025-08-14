const express = require('express');
const router = express.Router();
const { logger } = require('../config/logger');
const { authenticate } = require('../middleware/auth');

/**
 * Route pour recevoir les logs du frontend
 * POST /api/logs
 */
router.post('/', (req, res) => {
  console.log('Log reçu du frontend:', req.body);
  
  try {
    let level, message, additional = {};
    
    // ngx-logger envoie les logs au format { level: number, message: string, additional: any }
    // ou au format { level, timestamp, fileName, lineNumber, message, additional }
    if (req.body) {
      if (typeof req.body.level === 'number') {
        // Format ngx-logger
        const ngxLogLevel = req.body.level;
        level = ngxLogLevel === 0 ? 'TRACE' :
               ngxLogLevel === 1 ? 'DEBUG' :
               ngxLogLevel === 2 ? 'INFO' :
               ngxLogLevel === 3 ? 'WARN' :
               ngxLogLevel === 4 ? 'ERROR' :
               ngxLogLevel === 5 ? 'FATAL' : 'INFO';
               
        message = req.body.message || 'No message';
        additional = req.body.additional || {};
      } else {
        // Format personnalisé
        level = req.body.level || 'INFO';
        message = req.body.message || 'No message';
        additional = req.body.additional || {};
      }
    } else {
      level = 'INFO';
      message = 'Empty log received';
      additional = {};
    }
    
    // Ajouter des informations sur le client
    const clientInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      ...additional
    };
    
    // Mapper le niveau de log
    switch (level) {
      case 'TRACE':
      case 'DEBUG':
        logger.debug(`[Frontend] ${message}`, clientInfo);
        break;
      case 'INFO':
        logger.info(`[Frontend] ${message}`, clientInfo);
        break;
      case 'WARN':
        logger.warn(`[Frontend] ${message}`, clientInfo);
        break;
      case 'ERROR':
      case 'FATAL':
        logger.error(`[Frontend] ${message}`, clientInfo);
        break;
      default:
        logger.info(`[Frontend] ${message}`, clientInfo);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erreur de traitement des logs:', error);
    logger.error(`Erreur de traitement des logs: ${error.message}`, { error });
    res.status(200).json({ success: true }); // On renvoie tout de même une réponse 200 pour ne pas bloquer le client
  }
});

/**
 * Route pour récupérer les derniers logs (protégée, administrateurs seulement)
 * GET /api/logs
 */
router.get('/', authenticate, (req, res) => {
  // Vérifier si l'utilisateur est admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès non autorisé'
    });
  }
  
  // Dans une implémentation réelle, on pourrait récupérer les logs d'un stockage persistant
  // Ici, on retourne simplement une réponse générique
  res.status(200).json({
    success: true,
    message: 'Pour accéder aux logs complets, veuillez consulter les fichiers de logs sur le serveur.'
  });
});

module.exports = router;
