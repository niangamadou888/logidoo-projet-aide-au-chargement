module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your-default-jwt-secret-key-for-dev',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  saltRounds: 10,
  accessTokenCookieName: 'access_token'
}; 