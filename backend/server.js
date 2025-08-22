require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const routes = require('./src/routes');
const contenantRoutes = require('./src/routes/contenantRoutes'); // Ajoutez cette ligne

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (simple version)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
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

// API Routes
app.use('/api', routes);

const authRoutes = require('./src/routes/auth'); // ← assure-toi que ce chemin est correct
app.use('/auth', authRoutes); // → /api/auth/register, /api/auth/login

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

const simulationRoutes = require('./src/routes/simulationRoutes');

app.use('/api/simulations', simulationRoutes); // ← accessible via /api/simulations
app.use('/api/contenants',contenantRoutes);
app.use('/uploads', express.static('uploads'));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur backend démarré sur le port ${PORT}`);
});
