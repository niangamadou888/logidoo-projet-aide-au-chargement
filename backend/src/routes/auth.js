const express = require('express');
const { register, login, getCurrentUser, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Route for user registration
router.post('/register', register);

// Route for user login
router.post('/login', login);

// Password reset
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Route to get current user (protected)
router.get('/me', authenticate, getCurrentUser);

module.exports = router; 
