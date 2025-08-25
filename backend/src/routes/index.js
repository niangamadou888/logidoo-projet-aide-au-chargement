const express = require('express');
const authRoutes = require('./auth');
const colisRoutes = require('./colisRoutes');

const router = express.Router();

// Health check route
router.get('/ping', (req, res) => {
  res.json({ message: 'pong', status: 'ok' });
});

// Use auth routes
router.use('/auth', authRoutes);
router.use('/', colisRoutes);

// Export router
module.exports = router; 
