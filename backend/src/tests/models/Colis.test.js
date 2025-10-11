const mongoose = require('mongoose');
const ColisSchema = require('../../models/Colis');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testColis } = require('../fixtures/testData');

// Create a model from the schema for testing
const Colis = mongoose.model('Colis', ColisSchema);

describe('Colis Model', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('Colis Creation', () => {
    it('should create a valid colis', async () => {
      const colisData = { ...testColis[0] };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis._id).toBeDefined();
      expect(savedColis.reference).toBe(colisData.reference);
      expect(savedColis.type).toBe(colisData.type);
      expect(savedColis.poids).toBe(colisData.poids);
      expect(savedColis.longueur).toBe(colisData.longueur);
      expect(savedColis.largeur).toBe(colisData.largeur);
      expect(savedColis.hauteur).toBe(colisData.hauteur);
      expect(savedColis.quantite).toBe(colisData.quantite);
      expect(savedColis.fragile).toBe(colisData.fragile);
      expect(savedColis.gerbable).toBe(colisData.gerbable);
    });

    it('should create a colis with minimal data', async () => {
      const minimalData = {
        reference: 'MIN-001',
        type: 'Carton'
      };
      const colis = new Colis(minimalData);
      const savedColis = await colis.save();

      expect(savedColis._id).toBeDefined();
      expect(savedColis.reference).toBe(minimalData.reference);
      expect(savedColis.type).toBe(minimalData.type);
    });

    it('should create a fragile colis', async () => {
      const fragileData = {
        ...testColis[1],
        fragile: true
      };
      const colis = new Colis(fragileData);
      const savedColis = await colis.save();

      expect(savedColis.fragile).toBe(true);
    });

    it('should create a non-gerbable colis', async () => {
      const nonGerbableData = {
        ...testColis[1],
        gerbable: false
      };
      const colis = new Colis(nonGerbableData);
      const savedColis = await colis.save();

      expect(savedColis.gerbable).toBe(false);
    });
  });

  describe('Colis Dimensions', () => {
    it('should store correct dimensions', async () => {
      const colisData = {
        reference: 'DIM-001',
        type: 'Carton',
        longueur: 100,
        largeur: 50,
        hauteur: 75
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.longueur).toBe(100);
      expect(savedColis.largeur).toBe(50);
      expect(savedColis.hauteur).toBe(75);
    });

    it('should handle large dimensions', async () => {
      const colisData = {
        reference: 'LARGE-001',
        type: 'Palette',
        longueur: 1200,
        largeur: 800,
        hauteur: 1500
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.longueur).toBe(1200);
      expect(savedColis.largeur).toBe(800);
      expect(savedColis.hauteur).toBe(1500);
    });
  });

  describe('Colis Weight and Quantity', () => {
    it('should store weight correctly', async () => {
      const colisData = {
        reference: 'WEIGHT-001',
        type: 'Carton',
        poids: 25.5
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.poids).toBe(25.5);
    });

    it('should store quantity correctly', async () => {
      const colisData = {
        reference: 'QTY-001',
        type: 'Carton',
        quantite: 10
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.quantite).toBe(10);
    });

    it('should handle zero weight', async () => {
      const colisData = {
        reference: 'ZERO-001',
        type: 'Carton',
        poids: 0
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.poids).toBe(0);
    });
  });

  describe('Colis Recipient Information', () => {
    it('should store recipient information', async () => {
      const colisData = {
        reference: 'REC-001',
        type: 'Carton',
        nomDestinataire: 'John Doe',
        adresse: '123 Test Street',
        telephone: '0123456789'
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.nomDestinataire).toBe('John Doe');
      expect(savedColis.adresse).toBe('123 Test Street');
      expect(savedColis.telephone).toBe('0123456789');
    });
  });

  describe('Colis Status and Color', () => {
    it('should store status', async () => {
      const colisData = {
        reference: 'STAT-001',
        type: 'Carton',
        statut: 'en_transit'
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.statut).toBe('en_transit');
    });

    it('should store color', async () => {
      const colisData = {
        reference: 'COL-001',
        type: 'Carton',
        couleur: '#FF5733'
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.couleur).toBe('#FF5733');
    });
  });

  describe('Colis References', () => {
    it('should store conteneur reference', async () => {
      const conteneurId = new mongoose.Types.ObjectId();
      const colisData = {
        reference: 'REF-001',
        type: 'Carton',
        conteneurId: conteneurId
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.conteneurId.toString()).toBe(conteneurId.toString());
    });

    it('should store camion reference', async () => {
      const camionId = new mongoose.Types.ObjectId();
      const colisData = {
        reference: 'REF-002',
        type: 'Carton',
        camionId: camionId
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.camionId.toString()).toBe(camionId.toString());
    });
  });

  describe('Colis Date Handling', () => {
    it('should store dateAjout', async () => {
      const testDate = new Date('2025-01-01');
      const colisData = {
        reference: 'DATE-001',
        type: 'Carton',
        dateAjout: testDate
      };
      const colis = new Colis(colisData);
      const savedColis = await colis.save();

      expect(savedColis.dateAjout).toEqual(testDate);
    });
  });
});
