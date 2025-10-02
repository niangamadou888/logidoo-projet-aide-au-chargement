const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const authConfig = require('../config/auth');
const { sendMail } = require('../utils/mailer');

// Register a new user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or username already exists' 
      });
    }
    
    // Create new user with default role 'user'
    const user = new User({
      username,
      email,
      password,
      role: 'user'
    });
    
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user is active
    if (!user.active) {
      return res.status(403).json({ success: false, message: 'Account is disabled' });
    }
    
    // Validate password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user info', error: error.message });
  }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const users = await User.find().select('-password -resetPasswordToken -resetPasswordExpires');

    res.status(200).json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get users', error: error.message });
  }
};

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiresIn }
  );
};

module.exports = {
  register,
  login,
  getCurrentUser,
  getAllUsers
};

// Password reset: request reset link
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // For security, respond success anyway
      return res.status(200).json({ success: true, message: 'If an account exists, a reset link was sent' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'https://logidoo.netlify.app';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    const subject = 'Reset your password';
    const text = `We received a request to reset your password.\n\n` +
      `Click the link below to set a new password (valid for 1 hour):\n${resetUrl}\n\n` +
      `If you did not request this, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 16px 0;">Reset your password</h2>
        <p>We received a request to reset your password.</p>
        <p>
          Click the button below to set a new password. This link is valid for 1 hour.
        </p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#1976d2;color:#fff;text-decoration:none;padding:10px 16px;border-radius:4px;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p>If the button doesn't work, paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    try {
      await sendMail({ to: email, subject, text, html });
    } catch (mailErr) {
      console.error('SMTP send error (continuing with success response):', mailErr);
      // We continue with success to avoid leaking whether the email exists
    }

    const payload = { success: true, message: 'If an account exists, a reset link was sent' };
    if (process.env.NODE_ENV !== 'production') {
      payload.devToken = token;
      payload.resetUrl = resetUrl;
    }
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process password reset request' });
  }
};

// Password reset: confirm new password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password; // will be hashed by pre-save hook
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

module.exports.forgotPassword = forgotPassword;
module.exports.resetPassword = resetPassword;
