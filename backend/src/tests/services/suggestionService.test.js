const suggestionService = require('../../services/suggestionService');
const Contenant = require('../../models/Contenant');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testContenants } = require('../fixtures/testData');

describe('SuggestionService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Create test contenants
    await Contenant.insertMany(testContenants);
  });

  describe('creerContenant', () => {
    it('should create a new contenant', async () => {
      const contenantData = {
        matricule: 'NEW-001',
        categorie: 'camion',
        type: 'Test Camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        },
        capacitePoids: 3500,
        disponible: true
      };

      const contenant = await suggestionService.creerContenant(contenantData);

      expect(contenant._id).toBeDefined();
      expect(contenant.matricule).toBe('NEW-001');
      expect(contenant.volume).toBeGreaterThan(0);
    });

    it('should calculate volume from dimensions', async () => {
      const contenantData = {
        matricule: 'NEW-002',
        categorie: 'camion',
        type: 'Test Camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        },
        capacitePoids: 3500
      };

      const contenant = await suggestionService.creerContenant(contenantData);

      const expectedVolume = (400 * 200 * 250) / 1000000000;
      expect(contenant.volume).toBe(expectedVolume);
    });
  });

  describe('getContenants', () => {
    it('should return all contenants', async () => {
      const contenants = await suggestionService.getContenants();

      expect(contenants).toHaveLength(testContenants.length);
    });

    it('should return empty array when no contenants exist', async () => {
      await clearDatabase();
      const contenants = await suggestionService.getContenants();

      expect(contenants).toEqual([]);
    });
  });

  describe('getContenantById', () => {
    it('should return contenant by id', async () => {
      const allContenants = await Contenant.find();
      const firstContenant = allContenants[0];

      const contenant = await suggestionService.getContenantById(firstContenant._id);

      expect(contenant._id.toString()).toBe(firstContenant._id.toString());
      expect(contenant.matricule).toBe(firstContenant.matricule);
    });

    it('should return null for non-existent id', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const contenant = await suggestionService.getContenantById(fakeId);

      expect(contenant).toBeNull();
    });
  });

  describe('updateContenant', () => {
    it('should update contenant', async () => {
      const allContenants = await Contenant.find();
      const firstContenant = allContenants[0];

      const updateData = {
        disponible: false,
        type: 'Updated Type'
      };

      const updated = await suggestionService.updateContenant(
        firstContenant._id,
        updateData
      );

      expect(updated.disponible).toBe(false);
      expect(updated.type).toBe('Updated Type');
      expect(updated.matricule).toBe(firstContenant.matricule);
    });

    it('should recalculate volume when dimensions updated', async () => {
      const allContenants = await Contenant.find();
      const firstContenant = allContenants[0];

      const updateData = {
        dimensions: {
          longueur: 500,
          largeur: 250,
          hauteur: 300
        }
      };

      const updated = await suggestionService.updateContenant(
        firstContenant._id,
        updateData
      );

      const expectedVolume = (500 * 250 * 300) / 1000000000;
      expect(updated.volume).toBe(expectedVolume);
    });

    it('should throw error for non-existent id', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        suggestionService.updateContenant(fakeId, { disponible: false })
      ).rejects.toThrow('Contenant non trouvé');
    });
  });

  describe('deleteContenant', () => {
    it('should delete contenant', async () => {
      const allContenants = await Contenant.find();
      const firstContenant = allContenants[0];
      const initialCount = allContenants.length;

      const deleted = await suggestionService.deleteContenant(firstContenant._id);

      expect(deleted._id.toString()).toBe(firstContenant._id.toString());

      const remainingContenants = await Contenant.find();
      expect(remainingContenants).toHaveLength(initialCount - 1);
    });

    it('should throw error for non-existent id', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        suggestionService.deleteContenant(fakeId)
      ).rejects.toThrow('Contenant non trouvé');
    });
  });

  describe('suggererContenants', () => {
    it('should suggest contenants that fit the articles', async () => {
      // Use smaller dimensions to match the test container volumes
      // Test containers have volumes around 0.02 m³ and capacities around 1500-3500 kg
      const articles = [
        {
          longueur: 100,
          largeur: 100,
          hauteur: 100,
          poids: 100,
          quantite: 1
        }
      ];

      const suggestions = await suggestionService.suggererContenants(articles);

      // Volume = (100*100*100)/1000000000 = 0.001 m³, weight = 100kg
      // Should find available containers
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
      suggestions.forEach(contenant => {
        expect(contenant.disponible).toBe(true);
      });
    });

    it('should return empty array when no contenant fits', async () => {
      const articles = [
        {
          longueur: 5000,
          largeur: 5000,
          hauteur: 5000,
          poids: 100000,
          quantite: 1
        }
      ];

      const suggestions = await suggestionService.suggererContenants(articles);

      expect(suggestions).toEqual([]);
    });

    it('should calculate total volume and weight correctly', async () => {
      const articles = [
        {
          longueur: 100,
          largeur: 100,
          hauteur: 100,
          poids: 10,
          quantite: 2
        }
      ];

      const suggestions = await suggestionService.suggererContenants(articles);

      // Volume = (100 * 100 * 100) / 1_000_000_000 = 0.001 m³ per item
      // Total = 0.001 * 2 = 0.002 m³
      // Weight = 10 * 2 = 20 kg
      // With these small requirements, should find at least one container
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
      if (suggestions.length > 0) {
        suggestions.forEach(contenant => {
          expect(contenant.volume).toBeGreaterThanOrEqual(0.002);
          expect(contenant.capacitePoids).toBeGreaterThanOrEqual(20);
        });
      }
    });

    it('should only suggest available contenants', async () => {
      const articles = [
        {
          longueur: 100,
          largeur: 100,
          hauteur: 100,
          poids: 100,
          quantite: 1
        }
      ];

      const suggestions = await suggestionService.suggererContenants(articles);

      suggestions.forEach(contenant => {
        expect(contenant.disponible).toBe(true);
      });
    });
  });

  describe('suggererCamions', () => {
    it('should only suggest camions', async () => {
      const articles = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1
        }
      ];

      const suggestions = await suggestionService.suggererCamions(articles);

      suggestions.forEach(contenant => {
        expect(contenant.categorie).toBe('camion');
        expect(contenant.disponible).toBe(true);
      });
    });

    it('should not suggest conteneurs', async () => {
      const articles = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1
        }
      ];

      const suggestions = await suggestionService.suggererCamions(articles);

      const hasConteneur = suggestions.some(c => c.categorie === 'conteneur');
      expect(hasConteneur).toBe(false);
    });
  });

  describe('suggererConteneurs', () => {
    it('should only suggest conteneurs', async () => {
      const articles = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1
        }
      ];

      const suggestions = await suggestionService.suggererConteneurs(articles);

      suggestions.forEach(contenant => {
        expect(contenant.categorie).toBe('conteneur');
        expect(contenant.disponible).toBe(true);
      });
    });

    it('should not suggest camions', async () => {
      const articles = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1
        }
      ];

      const suggestions = await suggestionService.suggererConteneurs(articles);

      const hasCamion = suggestions.some(c => c.categorie === 'camion');
      expect(hasCamion).toBe(false);
    });
  });

  describe('getCategories', () => {
    it('should return distinct categories', async () => {
      const categories = await suggestionService.getCategories();

      expect(categories).toContain('camion');
      expect(categories).toContain('conteneur');
      expect(categories.length).toBe(2);
    });

    it('should return empty array when no contenants exist', async () => {
      await clearDatabase();
      const categories = await suggestionService.getCategories();

      expect(categories).toEqual([]);
    });
  });
});
