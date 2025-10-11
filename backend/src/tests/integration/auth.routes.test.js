const request = require('supertest');
const express = require('express');
const User = require('../../models/User');
const authRoutes = require('../../routes/auth');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testUsers } = require('../fixtures/testData');

// Create a simple Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  return app;
};

describe('Auth Routes Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toMatchObject({
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      });
    });

    it('should fail to register with existing email', async () => {
      const user = new User(testUsers.user);
      await user.save();

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'newuser',
          email: testUsers.user.email,
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should fail to register with missing fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser'
          // missing email and password
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      const user = new User(testUsers.user);
      await user.save();
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUsers.user.email,
          password: testUsers.user.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(testUsers.user.email);
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: testUsers.user.password
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUsers.user.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /auth/forgot-password', () => {
    beforeEach(async () => {
      const user = new User(testUsers.user);
      await user.save();
    });

    it('should send reset link for valid email', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: testUsers.user.email
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset link');
    });

    it('should return success even for non-existent email', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail without email', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/reset-password', () => {
    let resetToken;

    beforeEach(async () => {
      const user = new User(testUsers.user);
      resetToken = 'test-reset-token-123';
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 3600000);
      await user.save();
    });

    it('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with expired token', async () => {
      const user = await User.findOne({ email: testUsers.user.email });
      user.resetPasswordExpires = new Date(Date.now() - 3600000);
      await user.save();

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    let user;
    let token;

    beforeEach(async () => {
      user = new User(testUsers.user);
      await user.save();

      // Login to get token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUsers.user.email,
          password: testUsers.user.password
        });

      token = loginResponse.body.token;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUsers.user.email);
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
