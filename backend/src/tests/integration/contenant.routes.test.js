const request = require('supertest');
const express = require('express');
const contenantRoutes = require('../../routes/contenantRoutes');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const Contenant = require('../../models/Contenant');
const { testContenants } = require('../fixtures/testData');

// Mock the service
jest.mock('../../services/suggestionService');
const service = require('../../services/suggestionService');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/contenants', contenantRoutes);

describe('Contenant Routes Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/contenants/create', () => {
    it('should create a new contenant', async () => {
      const newContenant = {
        matricule: 'TEST-001',
        type: 'Camion',
        categorie: 'camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        },
        capacitePoids: 3500
      };

      service.creerContenant.mockResolvedValue({ ...newContenant, _id: 'mock-id' });

      const response = await request(app)
        .post('/api/contenants/create')
        .send(newContenant);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
    });

    it('should return 400 when matricule is missing', async () => {
      const invalidContenant = {
        type: 'Camion',
        dimensions: { longueur: 400, largeur: 200, hauteur: 250 }
      };

      const response = await request(app)
        .post('/api/contenants/create')
        .send(invalidContenant);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/contenants/suggestion', () => {
    it('should return container suggestions', async () => {
      const articles = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 2
        }
      ];

      service.suggererContenants.mockResolvedValue(testContenants);

      const response = await request(app)
        .post('/api/contenants/suggestion')
        .send({ articles });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle empty articles array', async () => {
      service.suggererContenants.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/contenants/suggestion')
        .send({ articles: [] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/contenants/suggestion/camions', () => {
    it('should return truck suggestions', async () => {
      const articles = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1
        }
      ];

      const camions = testContenants.filter(c => c.categorie === 'camion');
      service.suggererCamions.mockResolvedValue(camions);

      const response = await request(app)
        .post('/api/contenants/suggestion/camions')
        .send({ articles });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/contenants/suggestion/conteneurs', () => {
    it('should return container suggestions', async () => {
      const articles = [
        {
          longueur: 100,
          largeur: 80,
          hauteur: 60,
          poids: 500,
          quantite: 1
        }
      ];

      const conteneurs = testContenants.filter(c => c.categorie === 'conteneur');
      service.suggererConteneurs.mockResolvedValue(conteneurs);

      const response = await request(app)
        .post('/api/contenants/suggestion/conteneurs')
        .send({ articles });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/contenants', () => {
    it('should return all contenants', async () => {
      service.getContenants.mockResolvedValue(testContenants);

      const response = await request(app)
        .get('/api/contenants');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array when no contenants exist', async () => {
      service.getContenants.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/contenants');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('PUT /api/contenants/:id', () => {
    it('should update a contenant', async () => {
      const updateData = {
        type: 'Updated Type',
        capacitePoids: 4000
      };

      const updatedContenant = { ...testContenants[0], ...updateData, _id: 'test-id' };
      service.updateContenant.mockResolvedValue(updatedContenant);

      const response = await request(app)
        .put('/api/contenants/test-id')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('Updated Type');
    });

    it('should handle update errors', async () => {
      service.updateContenant.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .put('/api/contenants/invalid-id')
        .send({ type: 'Updated' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/contenants/:id', () => {
    it('should delete a contenant', async () => {
      service.deleteContenant.mockResolvedValue({ _id: 'test-id', deleted: true });

      const response = await request(app)
        .delete('/api/contenants/test-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('supprimé avec succès');
    });

    it('should handle delete errors', async () => {
      service.deleteContenant.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app)
        .delete('/api/contenants/invalid-id');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/contenants/categories', () => {
    it('should return categories', async () => {
      const mockCategories = ['camion', 'conteneur'];
      service.getCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/contenants/categories');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
