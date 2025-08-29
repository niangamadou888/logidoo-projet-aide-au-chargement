const { perfLogger } = require('../config/logger');

/**
 * Middleware pour suivre les performances des routes API
 * Mesure le temps d'exécution et log les informations de performance
 */
const performanceTracker = (req, res, next) => {
  // Marquer le temps de début
  const start = process.hrtime();
  const requestId = Date.now().toString();
  
  // Stocker le requestId pour identification
  req.requestId = requestId;
  
  // Log initial de la requête
  perfLogger.debug(`[${requestId}] Début de la requête: ${req.method} ${req.originalUrl}`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Capturer les infos de réponse
  const originalSend = res.send;
  res.send = function(body) {
    const diff = process.hrtime(start);
    const time = diff[0] * 1e3 + diff[1] * 1e-6; // temps en millisecondes

    // Log de fin de requête avec les métriques de performance
    perfLogger.debug(`[${requestId}] Fin de la requête: ${req.method} ${req.originalUrl} - ${time.toFixed(2)}ms`, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      contentLength: body ? body.length : 0,
      responseTime: time.toFixed(2),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
    });

    originalSend.call(this, body);
  };

  next();
};

module.exports = performanceTracker;
