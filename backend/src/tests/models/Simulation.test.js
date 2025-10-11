const Simulation = require('../../models/Simulation');
const User = require('../../models/User');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testUsers, testColis, testSimulation } = require('../fixtures/testData');

describe('Simulation Model', () => {
  let testUser;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Create a test user for simulations
    testUser = new User(testUsers.user);
    await testUser.save();
  });

  describe('Simulation Creation', () => {
    it('should create a valid simulation', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: testSimulation.nom,
        description: testSimulation.description,
        colis: testSimulation.colis
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      expect(savedSimulation._id).toBeDefined();
      expect(savedSimulation.utilisateurId.toString()).toBe(testUser._id.toString());
      expect(savedSimulation.nom).toBe(testSimulation.nom);
      expect(savedSimulation.description).toBe(testSimulation.description);
      expect(savedSimulation.colis).toHaveLength(testSimulation.colis.length);
      expect(savedSimulation.date).toBeInstanceOf(Date);
    });

    it('should create simulation without nom', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        colis: testColis
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      expect(savedSimulation._id).toBeDefined();
      expect(savedSimulation.nom).toBeUndefined();
    });

    it('should create simulation without description', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      expect(savedSimulation._id).toBeDefined();
      expect(savedSimulation.description).toBeUndefined();
    });

    it('should set default resultats to null', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      expect(savedSimulation.resultats).toBeNull();
    });

    it('should set default date to now', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis
      };
      const before = new Date();
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();
      const after = new Date();

      expect(savedSimulation.date.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(savedSimulation.date.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Simulation Validation', () => {
    it('should fail without utilisateurId', async () => {
      const simulationData = {
        nom: 'Test',
        colis: testColis
      };
      const simulation = new Simulation(simulationData);

      await expect(simulation.save()).rejects.toThrow();
    });

    it('should allow empty colis array', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: []
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      expect(savedSimulation.colis).toEqual([]);
    });
  });

  describe('Simulation with Colis', () => {
    it('should store colis data correctly', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      expect(savedSimulation.colis).toHaveLength(testColis.length);
      expect(savedSimulation.colis[0].reference).toBe(testColis[0].reference);
      expect(savedSimulation.colis[0].poids).toBe(testColis[0].poids);
      expect(savedSimulation.colis[0].fragile).toBe(testColis[0].fragile);
      expect(savedSimulation.colis[0].gerbable).toBe(testColis[0].gerbable);
    });

    it('should store colis dimensions', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      const firstColis = savedSimulation.colis[0];
      expect(firstColis.longueur).toBe(testColis[0].longueur);
      expect(firstColis.largeur).toBe(testColis[0].largeur);
      expect(firstColis.hauteur).toBe(testColis[0].hauteur);
    });
  });

  describe('Simulation with Resultats', () => {
    it('should store resultats with stats', async () => {
      const resultatsData = {
        success: true,
        stats: {
          totalVolume: 1.5,
          totalWeight: 100,
          containersCount: 1,
          avgVolumeUtilization: 0.75,
          avgWeightUtilization: 0.65,
          fragilesCount: 2,
          nonGerbablesCount: 1
        },
        containers: [],
        placements: [],
        unplacedItems: []
      };

      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis,
        resultats: resultatsData
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      expect(savedSimulation.resultats).toBeDefined();
      expect(savedSimulation.resultats.success).toBe(true);
      expect(savedSimulation.resultats.stats.totalVolume).toBe(1.5);
      expect(savedSimulation.resultats.stats.containersCount).toBe(1);
    });

    it('should store containers in resultats', async () => {
      const resultatsData = {
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
        containers: [{
          id: '1',
          type: 'Test Container',
          capacity: { volume: 20, poids: 3500 }
        }],
        placements: [],
        unplacedItems: []
      };

      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis,
        resultats: resultatsData
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      expect(savedSimulation.resultats.containers).toHaveLength(1);
      expect(savedSimulation.resultats.containers[0].id).toBe('1');
    });
  });

  describe('Simulation getStats Method', () => {
    it('should calculate total volume correctly', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: [{
          reference: 'TEST',
          poids: 10,
          longueur: 100,
          largeur: 100,
          hauteur: 100,
          quantite: 2,
          fragile: false,
          gerbable: true
        }]
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      const stats = savedSimulation.getStats();

      // Volume = (100 * 100 * 100) / 1_000_000 = 1 m³ per item, 2 items = 2 m³
      expect(stats.totalVolume).toBe(2);
      expect(stats.totalWeight).toBe(20);
      expect(stats.colisCount).toBe(1);
    });

    it('should calculate total weight correctly', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      const stats = savedSimulation.getStats();

      // COL-001: 10kg * 2 = 20kg
      // COL-002: 50kg * 1 = 50kg
      // COL-003: 25kg * 3 = 75kg
      // Total: 145kg
      expect(stats.totalWeight).toBe(145);
    });

    it('should return hasResultats as false when no resultats', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      const stats = savedSimulation.getStats();
      expect(stats.hasResultats).toBe(false);
    });

    it('should return hasResultats as true when resultats exist', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis,
        resultats: {
          success: true,
          stats: {
            totalVolume: 1,
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
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      const stats = savedSimulation.getStats();
      expect(stats.hasResultats).toBe(true);
    });
  });

  describe('Simulation Population', () => {
    it('should populate utilisateurId reference', async () => {
      const simulationData = {
        utilisateurId: testUser._id,
        nom: 'Test',
        colis: testColis
      };
      const simulation = new Simulation(simulationData);
      const savedSimulation = await simulation.save();

      const populatedSimulation = await Simulation.findById(savedSimulation._id)
        .populate('utilisateurId');

      expect(populatedSimulation.utilisateurId.username).toBe(testUser.username);
      expect(populatedSimulation.utilisateurId.email).toBe(testUser.email);
    });
  });
});
