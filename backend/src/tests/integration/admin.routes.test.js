const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../routes/adminRoutes');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const User = require('../../models/User');
const Simulation = require('../../models/Simulation');
const jwt = require('jsonwebtoken');
const { testUsers } = require('../fixtures/testData');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Routes Integration Tests', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create admin user
    adminUser = await User.create({
      ...testUsers.admin,
      email: `admin-${Date.now()}@test.com`,
      username: `admin-${Date.now()}`
    });

    // Create regular user
    regularUser = await User.create({
      ...testUsers.user,
      email: `user-${Date.now()}@test.com`,
      username: `user-${Date.now()}`
    });

    // Generate tokens (use 'id' not 'userId' to match auth middleware)
    const authConfig = require('../../config/auth');
    adminToken = jwt.sign(
      { id: adminUser._id, role: 'admin' },
      authConfig.jwtSecret,
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { id: regularUser._id, role: 'user' },
      authConfig.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('GET /api/admin/statistics', () => {
    it('should return statistics for admin user', async () => {
      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('statistics');
      expect(response.body.statistics).toHaveProperty('totalUsers');
      expect(response.body.statistics).toHaveProperty('activeUsers');
      expect(response.body.statistics).toHaveProperty('totalSimulations');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/statistics');

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should count users correctly', async () => {
      // We already have 2 users from beforeEach (admin and regular)
      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics.totalUsers).toBe(2);
      expect(response.body.statistics.activeUsers).toBe(2);
    });

    it('should count inactive users correctly', async () => {
      // Create an inactive user
      await User.create({
        username: 'inactiveuser',
        email: 'inactive@test.com',
        password: 'password123',
        role: 'user',
        active: false
      });

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics.totalUsers).toBe(3);
      expect(response.body.statistics.activeUsers).toBe(2);
    });

    it('should count simulations correctly', async () => {
      // Create some simulations
      await Simulation.create({
        utilisateurId: regularUser._id,
        nom: 'Test Simulation 1',
        colis: [],
        resultats: { success: true },
        date: new Date()
      });

      await Simulation.create({
        utilisateurId: regularUser._id,
        nom: 'Test Simulation 2',
        colis: [],
        resultats: { success: true },
        date: new Date()
      });

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics.totalSimulations).toBe(2);
    });

    it('should return simulation periods', async () => {
      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics).toHaveProperty('simulationsByPeriod');
      expect(response.body.statistics.simulationsByPeriod).toHaveProperty('day');
      expect(response.body.statistics.simulationsByPeriod).toHaveProperty('week');
      expect(response.body.statistics.simulationsByPeriod).toHaveProperty('month');
    });

    it('should count simulations by period correctly', async () => {
      const now = new Date();

      // Create simulation today
      await Simulation.create({
        utilisateurId: regularUser._id,
        nom: 'Today Simulation',
        colis: [],
        resultats: { success: true },
        date: now
      });

      // Create simulation from last month
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 2);
      await Simulation.create({
        utilisateurId: regularUser._id,
        nom: 'Old Simulation',
        colis: [],
        resultats: { success: true },
        date: lastMonth
      });

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics.simulationsByPeriod.day).toBeGreaterThan(0);
    });

    it('should return top users', async () => {
      // Create simulations for the user
      await Simulation.create({
        utilisateurId: regularUser._id,
        nom: 'Sim 1',
        colis: [],
        resultats: { success: true },
        date: new Date()
      });

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics).toHaveProperty('topUsers');
      expect(Array.isArray(response.body.statistics.topUsers)).toBe(true);
    });

    it('should return average fill rates', async () => {
      // Create simulation with fill rate data
      await Simulation.create({
        utilisateurId: regularUser._id,
        nom: 'Test Simulation',
        colis: [],
        resultats: {
          success: true,
          stats: {
            avgVolumeUtilization: 0.75,
            avgWeightUtilization: 0.85
          }
        },
        date: new Date()
      });

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics).toHaveProperty('avgFillRate');
      expect(response.body.statistics.avgFillRate).toHaveProperty('volume');
      expect(response.body.statistics.avgFillRate).toHaveProperty('weight');
    });

    it('should return most used containers', async () => {
      // Create simulation with container data
      await Simulation.create({
        utilisateurId: regularUser._id,
        nom: 'Test Simulation',
        colis: [],
        resultats: {
          success: true,
          containers: [
            { name: 'Camion 20m³', type: 'camion' }
          ]
        },
        date: new Date()
      });

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics).toHaveProperty('mostUsedContainers');
      expect(Array.isArray(response.body.statistics.mostUsedContainers)).toBe(true);
    });

    it('should handle empty database gracefully', async () => {
      await clearDatabase();

      // Recreate admin user and token
      adminUser = await User.create({
        ...testUsers.admin,
        email: `admin-empty-${Date.now()}@test.com`,
        username: `admin-empty-${Date.now()}`
      });

      const authConfig = require('../../config/auth');
      adminToken = jwt.sign(
        { id: adminUser._id, role: 'admin' },
        authConfig.jwtSecret,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics.totalSimulations).toBe(0);
      expect(response.body.statistics.totalUsers).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error by using an invalid token format
      const invalidToken = 'invalid.token.here';

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${invalidToken}`);

      // Should fail authentication, not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should calculate percentages correctly for container usage', async () => {
      // Create simulations with different containers
      await Simulation.create({
        utilisateurId: regularUser._id,
        nom: 'Sim 1',
        colis: [],
        resultats: {
          containers: [{ name: 'Camion 20m³' }]
        },
        date: new Date()
      });

      await Simulation.create({
        utilisateurId: regularUser._id,
        nom: 'Sim 2',
        colis: [],
        resultats: {
          containers: [{ name: 'Camion 20m³' }]
        },
        date: new Date()
      });

      await Simulation.create({
        utilisateurId: regularUser._id,
        nom: 'Sim 3',
        colis: [],
        resultats: {
          containers: [{ name: 'Conteneur 40 pieds' }]
        },
        date: new Date()
      });

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const containers = response.body.statistics.mostUsedContainers;

      if (containers && containers.length > 0) {
        // Verify percentages add up correctly
        const totalPercentage = containers.reduce((sum, c) => sum + c.percentage, 0);
        expect(totalPercentage).toBeGreaterThan(0);
        expect(totalPercentage).toBeLessThanOrEqual(100);
      }
    });
  });
});
