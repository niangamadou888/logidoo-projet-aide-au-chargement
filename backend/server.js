require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const routes = require('./src/routes');
const contenantRoutes = require('./src/routes/contenantRoutes'); // Ajoutez cette ligne
const morgan = require('morgan');
const responseTime = require('response-time');
const helmet = require('helmet');
const compression = require('compression');
const { logger } = require('./src/config/logger');
const fs = require('fs');
const path = require('path');
const i18n = require('./src/config/i18n');
const languageMiddleware = require('./src/middleware/language');

// Création du répertoire de logs s'il n'existe pas
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Stream pour morgan (logs HTTP)
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });

const app = express();

// Middleware de sécurité
app.use(helmet());

// Middleware de compression
app.use(compression());

// Middleware pour mesurer le temps de réponse
app.use(responseTime((req, res, time) => {
  if (time > 500) {  // Log les requêtes qui prennent plus de 500ms
    logger.warn(`Route lente détectée: ${req.method} ${req.url} - ${time.toFixed(2)}ms`);
  }
  
  // Ajouter le temps de réponse aux headers pour les analyses frontend
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
}));

// Logging des requêtes HTTP avec Morgan
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev')); // Version console pour développement

// Middleware de base avec limites augmentées pour des payloads volumineux (simulations)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Configuration i18n
app.use(i18n.init);
app.use(languageMiddleware);

// Middleware pour ajouter la traduction aux réponses
app.use((req, res, next) => {
  res.t = req.t || i18n.__;
  next();
});

// CORS middleware (simple version)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Language');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.error('MongoDB connection error:', err));

// Performance monitoring middleware
const performanceTracker = require('./src/middleware/performance');
app.use('/api', performanceTracker);

// API Routes
app.use('/api', routes);

const authRoutes = require('./src/routes/auth'); // ← assure-toi que ce chemin est correct
app.use('/auth', authRoutes); // → /api/auth/register, /api/auth/login

const logsRoutes = require('./src/routes/logsRoute');
app.use('/api/logs', logsRoutes); // → /api/logs

// Error handling middleware
app.use((err, req, res, next) => {
  const errorId = Date.now().toString();
  logger.error(`Error ID: ${errorId} - ${err.message}`, {
    errorId,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user ? req.user.id : 'anonymous'
  });

  res.status(500).json({
    success: false,
    message: req.__ ? req.__('errors.general') : 'Server error',
    errorId: errorId,
    error: process.env.NODE_ENV === 'development' ? err.message : req.__ ? req.__('errors.general') : 'An error occurred'
  });
});

const simulationRoutes = require('./src/routes/simulationRoutes');

app.use('/api/simulations', simulationRoutes); // ← accessible via /api/simulations
app.use('/api/contenants',contenantRoutes);
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none"); // optionnel si tu n’utilises pas COEP
  }
}));


// Route pour la surveillance du statut de l'API
app.get('/api/health', (req, res) => {
  const healthData = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    env: process.env.NODE_ENV || 'development',
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };

  logger.debug('Health check requested', healthData);
  res.json(healthData);
});

// Route pour tester l'i18n
app.get('/api/status', (req, res) => {
  res.json({
    message: req.__('api.status.success'),
    language: req.language,
    timestamp: Date.now()
  });
});

// Route pour vérifier les métriques de performance
app.get('/api/metrics', (req, res) => {
  // Cette route pourrait être protégée par authentification en production
  const metrics = {
    timestamp: Date.now(),
    process: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
    },
    os: {
      totalmem: require('os').totalmem(),
      freemem: require('os').freemem(),
      loadavg: require('os').loadavg(),
    },
    database: {
      mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    }
  };
  
  logger.debug('Metrics requested', metrics);
  res.json(metrics);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Serveur backend démarré sur le port ${PORT}`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});
