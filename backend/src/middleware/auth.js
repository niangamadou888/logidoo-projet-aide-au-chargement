const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const User = require('../models/User');

// Middleware to authenticate JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.[authConfig.accessTokenCookieName];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, authConfig.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
    }
    
    next();
  };
};

// Admin authorization middleware
const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied: admin privileges required' });
  }

  next();
};

module.exports = { authenticate, authorize, authorizeAdmin }; 