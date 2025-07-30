const express = require('express');
const authRoutes = require('./auth');

const router = express.Router();

// Health check route
router.get('/ping', (req, res) => {
  res.json({ message: 'pong', status: 'ok' });
});

// Use auth routes
router.use('/auth', authRoutes);

// Export router
module.exports = router; 