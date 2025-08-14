const winston = require('winston');
const path = require('path');

// Configuration des formats pour les logs
const formats = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  })
);

// Création du répertoire de logs s'il n'existe pas
const logsDir = path.join(__dirname, '../../logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Configuration des transports (où les logs seront stockés)
const transports = [
  // Logs de console pour le développement
  new winston.transports.Console(),
  
  // Logs d'application normaux
  new winston.transports.File({ 
    filename: path.join(logsDir, 'app.log'),
    level: 'info',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Logs d'erreurs séparés
  new winston.transports.File({ 
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Logs spécifiques pour les performances
  new winston.transports.File({ 
    filename: path.join(logsDir, 'performance.log'),
    level: 'debug',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Création du logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: formats,
  transports,
});

// Logger de performance spécifique
const perfLogger = winston.createLogger({
  level: 'debug',
  format: formats,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'performance.log'),
      level: 'debug',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

module.exports = {
  logger,
  perfLogger
};
