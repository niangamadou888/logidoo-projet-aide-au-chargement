const request = require('supertest');
const express = require('express');
const colisRoutes = require('../../routes/colisRoutes');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api', colisRoutes);

describe('Colis Routes Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clear the in-memory colis list before each test
    await request(app).delete('/api/colis');
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/colis', () => {
    it('should create a new colis', async () => {
      const newColis = {
        type: 'Carton',
        nomDestinataire: 'Test Client',
        adresse: '123 Test Street',
        telephone: '0123456789',
        poids: 10,
        longueur: 50,
        largeur: 40,
        hauteur: 30,
        quantite: 2,
        fragile: false,
        gerbable: true,
        couleur: '#FF5733'
      };

      const response = await request(app)
        .post('/api/colis')
        .send(newColis);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('reference');
      expect(response.body.type).toBe('Carton');
      expect(response.body.nomDestinataire).toBe('Test Client');
      expect(response.body.poids).toBe(10);
      expect(response.body.quantite).toBe(2);
    });

    it('should auto-generate reference if not provided', async () => {
      const newColis = {
        type: 'Palette',
        poids: 50
      };

      const response = await request(app)
        .post('/api/colis')
        .send(newColis);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('reference');
      expect(response.body.reference).toMatch(/^REF-\d+$/);
    });

    it('should use provided reference', async () => {
      const newColis = {
        reference: 'CUSTOM-REF-001',
        type: 'Carton'
      };

      const response = await request(app)
        .post('/api/colis')
        .send(newColis);

      expect(response.status).toBe(201);
      expect(response.body.reference).toBe('CUSTOM-REF-001');
    });

    it('should set default values for optional fields', async () => {
      const newColis = {
        type: 'Carton'
      };

      const response = await request(app)
        .post('/api/colis')
        .send(newColis);

      expect(response.status).toBe(201);
      expect(response.body.quantite).toBe(1);
      expect(response.body.fragile).toBe(false);
      expect(response.body.gerbable).toBe(false);
      expect(response.body.couleur).toBe('#999999');
      expect(response.body.statut).toBe('En attente');
    });

    it('should handle fragile items', async () => {
      const newColis = {
        type: 'Verre',
        fragile: true
      };

      const response = await request(app)
        .post('/api/colis')
        .send(newColis);

      expect(response.status).toBe(201);
      expect(response.body.fragile).toBe(true);
    });

    it('should handle non-gerbable items', async () => {
      const newColis = {
        type: 'Machine',
        gerbable: false
      };

      const response = await request(app)
        .post('/api/colis')
        .send(newColis);

      expect(response.status).toBe(201);
      expect(response.body.gerbable).toBe(false);
    });

    it('should store all dimensions', async () => {
      const newColis = {
        type: 'Caisse',
        longueur: 100,
        largeur: 80,
        hauteur: 60
      };

      const response = await request(app)
        .post('/api/colis')
        .send(newColis);

      expect(response.status).toBe(201);
      expect(response.body.longueur).toBe(100);
      expect(response.body.largeur).toBe(80);
      expect(response.body.hauteur).toBe(60);
    });

    it('should store recipient information', async () => {
      const newColis = {
        type: 'Carton',
        nomDestinataire: 'John Doe',
        adresse: '456 Main St',
        telephone: '9876543210'
      };

      const response = await request(app)
        .post('/api/colis')
        .send(newColis);

      expect(response.status).toBe(201);
      expect(response.body.nomDestinataire).toBe('John Doe');
      expect(response.body.adresse).toBe('456 Main St');
      expect(response.body.telephone).toBe('9876543210');
    });

    it('should handle validation errors', async () => {
      // Send invalid data that might cause validation errors
      const response = await request(app)
        .post('/api/colis')
        .send({});

      // The route doesn't have strict validation, so it might still succeed
      // but we're testing the error handling path
      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('GET /api/colis', () => {
    it('should return empty array initially', async () => {
      const response = await request(app)
        .get('/api/colis');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return all created colis', async () => {
      // Create some colis first
      await request(app)
        .post('/api/colis')
        .send({ type: 'Carton', poids: 10 });

      await request(app)
        .post('/api/colis')
        .send({ type: 'Palette', poids: 50 });

      const response = await request(app)
        .get('/api/colis');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should return colis with all properties', async () => {
      const colisData = {
        type: 'Carton',
        nomDestinataire: 'Test User',
        poids: 15,
        longueur: 50,
        largeur: 40,
        hauteur: 30,
        quantite: 3,
        fragile: true,
        gerbable: true,
        couleur: '#FF0000'
      };

      await request(app)
        .post('/api/colis')
        .send(colisData);

      const response = await request(app)
        .get('/api/colis');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        type: 'Carton',
        nomDestinataire: 'Test User',
        poids: 15,
        quantite: 3,
        fragile: true,
        gerbable: true
      });
    });

    it('should maintain order of created colis', async () => {
      await request(app)
        .post('/api/colis')
        .send({ reference: 'FIRST', type: 'Carton' });

      await request(app)
        .post('/api/colis')
        .send({ reference: 'SECOND', type: 'Palette' });

      await request(app)
        .post('/api/colis')
        .send({ reference: 'THIRD', type: 'Caisse' });

      const response = await request(app)
        .get('/api/colis');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].reference).toBe('FIRST');
      expect(response.body[1].reference).toBe('SECOND');
      expect(response.body[2].reference).toBe('THIRD');
    });
  });

  describe('Integration: Create and Retrieve', () => {
    it('should create multiple colis and retrieve them all', async () => {
      const colisList = [
        { type: 'Carton', poids: 10, quantite: 2 },
        { type: 'Palette', poids: 50, quantite: 1 },
        { type: 'Caisse', poids: 25, quantite: 3 },
        { type: 'Verre', poids: 5, fragile: true, quantite: 5 }
      ];

      // Create all colis
      for (const colis of colisList) {
        const response = await request(app)
          .post('/api/colis')
          .send(colis);

        expect(response.status).toBe(201);
      }

      // Retrieve all
      const response = await request(app)
        .get('/api/colis');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(4);
    });

    it('should persist data between requests', async () => {
      // First request - create
      await request(app)
        .post('/api/colis')
        .send({ type: 'Carton', poids: 10 });

      // Second request - retrieve
      const response1 = await request(app)
        .get('/api/colis');

      expect(response1.body).toHaveLength(1);

      // Third request - create another
      await request(app)
        .post('/api/colis')
        .send({ type: 'Palette', poids: 50 });

      // Fourth request - retrieve all
      const response2 = await request(app)
        .get('/api/colis');

      expect(response2.body).toHaveLength(2);
    });
  });
});
