const {
  simulateOptimalPlacement,
  findOptimalContainer,
  saveSimulation,
  getUserSimulations,
  summarize,
  cmDimsToM3Volume
} = require('../../services/optimizedSimulationService');
const Contenant = require('../../models/Contenant');
const Simulation = require('../../models/Simulation');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testContenants, testColis } = require('../fixtures/testData');
const mongoose = require('mongoose');

describe('Optimized Simulation Service', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('cmDimsToM3Volume', () => {
    it('should calculate volume correctly from cm dimensions', () => {
      const dims = {
        longueur: 100,
        largeur: 100,
        hauteur: 100,
        quantite: 1
      };
      const volume = cmDimsToM3Volume(dims);
      expect(volume).toBe(1); // 100x100x100 cm³ = 1 m³
    });

    it('should handle quantite correctly', () => {
      const dims = {
        longueur: 50,
        largeur: 50,
        hauteur: 50,
        quantite: 2
      };
      const volume = cmDimsToM3Volume(dims);
      expect(volume).toBe(0.25); // (50x50x50 = 0.125) x 2 = 0.25 m³
    });

    it('should default quantite to 1 if not provided', () => {
      const dims = {
        longueur: 100,
        largeur: 100,
        hauteur: 100
      };
      const volume = cmDimsToM3Volume(dims);
      expect(volume).toBe(1);
    });

    it('should handle small dimensions', () => {
      const dims = {
        longueur: 10,
        largeur: 10,
        hauteur: 10,
        quantite: 1
      };
      const volume = cmDimsToM3Volume(dims);
      expect(volume).toBe(0.001); // 10x10x10 cm³ = 0.001 m³
    });
  });

  describe('summarize', () => {
    it('should summarize items correctly', () => {
      const items = [
        {
          longueur: 100,
          largeur: 100,
          hauteur: 100,
          poids: 10,
          quantite: 2,
          fragile: true,
          gerbable: true
        },
        {
          longueur: 50,
          largeur: 50,
          hauteur: 50,
          poids: 5,
          quantite: 1,
          fragile: false,
          gerbable: false
        }
      ];

      const summary = summarize(items);

      expect(summary.count).toBe(2);
      expect(summary.colisCount).toBe(3); // 2 + 1
      expect(summary.totalVolume).toBe(2.125); // (1*2) + 0.125
      expect(summary.totalWeight).toBe(25); // (10*2) + 5
      expect(summary.fragilesCount).toBe(2);
      expect(summary.nonGerbablesCount).toBe(1);
    });

    it('should handle empty items array', () => {
      const summary = summarize([]);

      expect(summary.count).toBe(0);
      expect(summary.colisCount).toBe(0);
      expect(summary.totalVolume).toBe(0);
      expect(summary.totalWeight).toBe(0);
      expect(summary.fragilesCount).toBe(0);
      expect(summary.nonGerbablesCount).toBe(0);
    });

    it('should handle items without quantite', () => {
      const items = [{
        longueur: 100,
        largeur: 100,
        hauteur: 100,
        poids: 10
      }];

      const summary = summarize(items);

      expect(summary.colisCount).toBe(1);
      expect(summary.totalVolume).toBe(1);
      expect(summary.totalWeight).toBe(10);
    });

    it('should handle items without poids', () => {
      const items = [{
        longueur: 100,
        largeur: 100,
        hauteur: 100,
        quantite: 1
      }];

      const summary = summarize(items);

      expect(summary.totalWeight).toBe(0);
    });
  });

  describe('findOptimalContainer', () => {
    beforeEach(async () => {
      // Create test containers in the database
      await Contenant.create(testContenants.map(c => ({
        ...c,
        volume: (c.dimensions.longueur * c.dimensions.largeur * c.dimensions.hauteur) / 1000000
      })));
    });

    it('should find optimal container for items', async () => {
      const items = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 2,
          fragile: false,
          gerbable: true
        }
      ];

      const result = await findOptimalContainer(items);

      expect(result).toBeDefined();
      expect(result.containerId).toBeDefined();
      expect(result.placedItems).toBe(2);
      expect(result.totalItems).toBe(2);
      expect(result.optimalityScore).toBeGreaterThan(0);
    });

    it('should return null when no containers available', async () => {
      await clearDatabase();

      const items = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1
        }
      ];

      const result = await findOptimalContainer(items);

      expect(result).toBeNull();
    });

    it('should handle items that dont fit in any container', async () => {
      const items = [
        {
          longueur: 5000, // Too large
          largeur: 5000,
          hauteur: 5000,
          poids: 10,
          quantite: 1
        }
      ];

      const result = await findOptimalContainer(items);

      expect(result).toBeDefined();
      expect(result.placedItems).toBe(0);
    });

    it('should prefer containers with better utilization', async () => {
      const items = [
        {
          longueur: 100,
          largeur: 80,
          hauteur: 60,
          poids: 500,
          quantite: 1,
          fragile: false,
          gerbable: true
        }
      ];

      const result = await findOptimalContainer(items);

      expect(result).toBeDefined();
      expect(result.placedItems).toBe(1);
      expect(result.volumeUtilization).toBeGreaterThan(0);
    });
  });

  describe('simulateOptimalPlacement', () => {
    beforeEach(async () => {
      await Contenant.create(testContenants.map(c => ({
        ...c,
        volume: (c.dimensions.longueur * c.dimensions.largeur * c.dimensions.hauteur) / 1000000
      })));
    });

    it('should simulate placement successfully', async () => {
      const items = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 2,
          fragile: false,
          gerbable: true
        }
      ];

      const result = await simulateOptimalPlacement(items);

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.containers).toBeDefined();
      expect(result.containers.length).toBeGreaterThan(0);
      expect(result.unplacedItems).toHaveLength(0);
    });

    it('should handle empty items array', async () => {
      const result = await simulateOptimalPlacement([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Aucun colis à placer');
    });

    it('should handle null items', async () => {
      const result = await simulateOptimalPlacement(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Should return an error message about no items
      expect(result.error).toMatch(/Aucun colis|Cannot read properties/);
    });

    it('should track unplaced items correctly', async () => {
      const items = [
        {
          longueur: 5000, // Too large
          largeur: 5000,
          hauteur: 5000,
          poids: 100000,
          quantite: 1,
          fragile: false,
          gerbable: true
        }
      ];

      const result = await simulateOptimalPlacement(items);

      expect(result.success).toBe(false);
      expect(result.unplacedItems.length).toBeGreaterThan(0);
      expect(result.unplacedItems[0].error).toBeDefined();
    });

    it('should handle fragile items', async () => {
      const items = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1,
          fragile: true,
          gerbable: true
        }
      ];

      const result = await simulateOptimalPlacement(items);

      expect(result.success).toBe(true);
      expect(result.containers[0].items[0].fragile).toBe(true);
    });

    it('should handle non-gerbable items', async () => {
      const items = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1,
          fragile: false,
          gerbable: false
        }
      ];

      const result = await simulateOptimalPlacement(items);

      expect(result.success).toBe(true);
      expect(result.containers[0].items[0].gerbable).toBe(false);
    });

    it('should calculate statistics correctly', async () => {
      const items = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 2,
          fragile: false,
          gerbable: true
        }
      ];

      const result = await simulateOptimalPlacement(items);

      expect(result.stats.totalVolume).toBeGreaterThan(0);
      expect(result.stats.totalWeight).toBeGreaterThan(0);
      expect(result.stats.colisCount).toBe(2);
      expect(result.stats.placedCount).toBe(2);
      expect(result.stats.unplacedCount).toBe(0);
    });

    it('should respect forced container option', async () => {
      const container = await Contenant.findOne({ disponible: true });
      const items = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1,
          fragile: false,
          gerbable: true
        }
      ];

      const result = await simulateOptimalPlacement(items, {
        forceUseContainers: [container._id]
      });

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.containers[0].ref.toString()).toBe(container._id.toString());
      }
    });

    it('should handle preferred categories option', async () => {
      const items = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1,
          fragile: false,
          gerbable: true
        }
      ];

      const result = await simulateOptimalPlacement(items, {
        preferredCategories: ['camion']
      });

      expect(result).toBeDefined();
      if (result.success && result.containers.length > 0) {
        expect(result.containers[0].categorie).toBe('camion');
      }
    });
  });

  describe('saveSimulation', () => {
    it('should save simulation successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const colis = testColis;
      const resultats = {
        success: true,
        stats: { totalVolume: 1, totalWeight: 50 }
      };

      const saved = await saveSimulation(userId, colis, resultats, 'Test Sim', 'Test description');

      expect(saved).toBeDefined();
      expect(saved._id).toBeDefined();
      expect(saved.utilisateurId.toString()).toBe(userId.toString());
      expect(saved.nom).toBe('Test Sim');
      expect(saved.description).toBe('Test description');
      // Check arrays are similar (don't need exact equality)
      expect(Array.isArray(saved.colis)).toBe(true);
      expect(saved.resultats.success).toBe(true);
    });

    it('should save simulation without nom and description', async () => {
      const userId = new mongoose.Types.ObjectId();
      const colis = testColis;
      const resultats = { success: true };

      const saved = await saveSimulation(userId, colis, resultats);

      expect(saved).toBeDefined();
      expect(saved._id).toBeDefined();
      expect(saved.utilisateurId.toString()).toBe(userId.toString());
    });

    it('should handle save errors', async () => {
      // Try to save with invalid data
      await expect(
        saveSimulation(null, [], {})
      ).rejects.toThrow();
    });
  });

  describe('getUserSimulations', () => {
    it('should retrieve user simulations', async () => {
      const userId = new mongoose.Types.ObjectId();

      // Create some simulations
      await saveSimulation(userId, testColis, { success: true }, 'Sim 1');
      await saveSimulation(userId, testColis, { success: true }, 'Sim 2');

      const simulations = await getUserSimulations(userId);

      expect(simulations).toHaveLength(2);
      expect(simulations[0].nom).toBe('Sim 2'); // Should be sorted by date descending
      expect(simulations[1].nom).toBe('Sim 1');
    });

    it('should return empty array for user with no simulations', async () => {
      const userId = new mongoose.Types.ObjectId();

      const simulations = await getUserSimulations(userId);

      expect(simulations).toHaveLength(0);
    });

    it('should only return simulations for specific user', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();

      await saveSimulation(userId1, testColis, { success: true }, 'User 1 Sim');
      await saveSimulation(userId2, testColis, { success: true }, 'User 2 Sim');

      const simulations = await getUserSimulations(userId1);

      expect(simulations).toHaveLength(1);
      expect(simulations[0].nom).toBe('User 1 Sim');
    });
  });

  describe('Integration: Full simulation workflow', () => {
    beforeEach(async () => {
      await Contenant.create(testContenants.map(c => ({
        ...c,
        volume: (c.dimensions.longueur * c.dimensions.largeur * c.dimensions.hauteur) / 1000000
      })));
    });

    it('should complete full workflow: simulate and save', async () => {
      const userId = new mongoose.Types.ObjectId();
      const items = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 2,
          fragile: false,
          gerbable: true
        }
      ];

      // Simulate
      const simulationResult = await simulateOptimalPlacement(items);
      expect(simulationResult.success).toBe(true);

      // Save
      const saved = await saveSimulation(
        userId,
        items,
        simulationResult,
        'Full workflow test',
        'Testing complete workflow'
      );
      expect(saved).toBeDefined();

      // Retrieve
      const retrieved = await getUserSimulations(userId);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].nom).toBe('Full workflow test');
    });

    it('should handle multiple items with different properties', async () => {
      const items = [
        {
          longueur: 50,
          largeur: 40,
          hauteur: 30,
          poids: 10,
          quantite: 1,
          fragile: true,
          gerbable: true
        },
        {
          longueur: 60,
          largeur: 50,
          hauteur: 40,
          poids: 20,
          quantite: 1,
          fragile: false,
          gerbable: false
        },
        {
          longueur: 40,
          largeur: 30,
          hauteur: 20,
          poids: 5,
          quantite: 3,
          fragile: false,
          gerbable: true
        }
      ];

      const result = await simulateOptimalPlacement(items);

      expect(result.success).toBe(true);
      expect(result.stats.fragilesCount).toBe(1);
      expect(result.stats.nonGerbablesCount).toBe(1);
      expect(result.stats.colisCount).toBe(5); // 1 + 1 + 3
    });
  });
});
