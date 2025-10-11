const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Simulation = require('../../models/Simulation');
const Contenant = require('../../models/Contenant');
const simulationRoutes = require('../../routes/simulationRoutes');
const { authenticate } = require('../../middleware/auth');
const authConfig = require('../../config/auth');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testUsers, testColis, testContenants } = require('../fixtures/testData');

// Create a simple Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use('/api/simulations', simulationRoutes);
  return app;
};

describe('Simulation Routes Integration Tests', () => {
  let app;
  let user;
  let token;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create test user and token
    user = new User(testUsers.user);
    await user.save();

    token = jwt.sign(
      { id: user._id, role: user.role },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiresIn }
    );

    // Create test contenants
    await Contenant.insertMany(testContenants);
  });

  describe('POST /api/simulations', () => {
    it('should create a new simulation', async () => {
      const response = await request(app)
        .post('/api/simulations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nom: 'Test Simulation',
          description: 'Test description',
          colis: testColis
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.simulation).toBeDefined();
      expect(response.body.simulation.nom).toBe('Test Simulation');
      expect(response.body.simulation.colis).toHaveLength(testColis.length);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/simulations')
        .send({
          nom: 'Test Simulation',
          colis: testColis
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/simulations/preview', () => {
    it('should generate simulation preview', async () => {
      const response = await request(app)
        .post('/api/simulations/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({
          colis: testColis.slice(0, 1) // Use only first colis for faster test
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.executionTime).toBeDefined();
    });

    it('should fail without colis', async () => {
      const response = await request(app)
        .post('/api/simulations/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('colis');
    });

    it('should fail with empty colis array', async () => {
      const response = await request(app)
        .post('/api/simulations/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({
          colis: []
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/simulations/preview')
        .send({
          colis: testColis
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/simulations/optimal-container', () => {
    it('should find optimal container', async () => {
      const response = await request(app)
        .post('/api/simulations/optimal-container')
        .set('Authorization', `Bearer ${token}`)
        .send({
          colis: testColis.slice(0, 1)
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.optimalContainer).toBeDefined();
      expect(response.body.executionTime).toBeDefined();
    });

    it('should fail without colis', async () => {
      const response = await request(app)
        .post('/api/simulations/optimal-container')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/simulations/save', () => {
    it('should save simulation with results', async () => {
      const simulationData = {
        nom: 'Saved Simulation',
        description: 'Test',
        colis: testColis,
        resultats: {
          success: true,
          stats: {
            totalVolume: 1.5,
            totalWeight: 100,
            containersCount: 1,
            avgVolumeUtilization: 0.75,
            avgWeightUtilization: 0.65,
            fragilesCount: 0,
            nonGerbablesCount: 0
          },
          containers: [],
          placements: [],
          unplacedItems: []
        }
      };

      const response = await request(app)
        .post('/api/simulations/save')
        .set('Authorization', `Bearer ${token}`)
        .send(simulationData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.simulation).toBeDefined();
      expect(response.body.simulation.nom).toBe('Saved Simulation');
    });

    it('should fail without colis', async () => {
      const response = await request(app)
        .post('/api/simulations/save')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nom: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail without resultats', async () => {
      const response = await request(app)
        .post('/api/simulations/save')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nom: 'Test',
          colis: testColis
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/simulations/user', () => {
    beforeEach(async () => {
      // Create some simulations for the user
      await Simulation.create({
        utilisateurId: user._id,
        nom: 'Simulation 1',
        colis: testColis
      });
      await Simulation.create({
        utilisateurId: user._id,
        nom: 'Simulation 2',
        colis: testColis
      });
    });

    it('should get user simulations', async () => {
      const response = await request(app)
        .get('/api/simulations/user')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.simulations).toHaveLength(2);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/simulations/user');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/simulations/:id', () => {
    let simulation;

    beforeEach(async () => {
      simulation = await Simulation.create({
        utilisateurId: user._id,
        nom: 'Test Simulation',
        colis: testColis
      });
    });

    it('should get simulation by id', async () => {
      const response = await request(app)
        .get(`/api/simulations/${simulation._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.simulation.nom).toBe('Test Simulation');
    });

    it('should fail for non-existent simulation', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/simulations/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/simulations/${simulation._id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail when accessing another user simulation', async () => {
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@test.com',
        password: 'password123'
      });
      await otherUser.save();

      const otherUserToken = jwt.sign(
        { id: otherUser._id, role: otherUser.role },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      const response = await request(app)
        .get(`/api/simulations/${simulation._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('non autorisé');
    });
  });
});
