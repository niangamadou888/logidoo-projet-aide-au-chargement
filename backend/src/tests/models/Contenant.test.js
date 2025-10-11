const Contenant = require('../../models/Contenant');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testContenants } = require('../fixtures/testData');

describe('Contenant Model', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('Contenant Creation', () => {
    it('should create a valid camion', async () => {
      const contenantData = { ...testContenants[0] };
      const contenant = new Contenant(contenantData);
      const savedContenant = await contenant.save();

      expect(savedContenant._id).toBeDefined();
      expect(savedContenant.matricule).toBe(contenantData.matricule);
      expect(savedContenant.categorie).toBe('camion');
      expect(savedContenant.type).toBe(contenantData.type);
      expect(savedContenant.disponible).toBe(true);
    });

    it('should create a valid conteneur', async () => {
      const contenantData = { ...testContenants[1] };
      const contenant = new Contenant(contenantData);
      const savedContenant = await contenant.save();

      expect(savedContenant._id).toBeDefined();
      expect(savedContenant.categorie).toBe('conteneur');
    });

    it('should calculate volume automatically if not provided', async () => {
      const contenantData = {
        matricule: 'TEST-001',
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
      const contenant = new Contenant(contenantData);
      const savedContenant = await contenant.save();

      const expectedVolume = (400 * 200 * 250) / 1000000;
      expect(savedContenant.volume).toBe(expectedVolume);
    });

    it('should use provided volume if given', async () => {
      const contenantData = {
        matricule: 'TEST-002',
        categorie: 'camion',
        type: 'Test Camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        },
        volume: 25,
        capacitePoids: 3500,
        disponible: true
      };
      const contenant = new Contenant(contenantData);
      const savedContenant = await contenant.save();

      expect(savedContenant.volume).toBe(25);
    });
  });

  describe('Contenant Validation', () => {
    it('should fail without matricule', async () => {
      const contenantData = {
        categorie: 'camion',
        type: 'Test Camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        },
        capacitePoids: 3500
      };
      const contenant = new Contenant(contenantData);

      await expect(contenant.save()).rejects.toThrow();
    });

    it('should fail without categorie', async () => {
      const contenantData = {
        matricule: 'TEST-001',
        type: 'Test Camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        },
        capacitePoids: 3500
      };
      const contenant = new Contenant(contenantData);

      await expect(contenant.save()).rejects.toThrow();
    });

    it('should fail without type', async () => {
      const contenantData = {
        matricule: 'TEST-001',
        categorie: 'camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        },
        capacitePoids: 3500
      };
      const contenant = new Contenant(contenantData);

      await expect(contenant.save()).rejects.toThrow();
    });

    it('should fail without dimensions', async () => {
      const contenantData = {
        matricule: 'TEST-001',
        categorie: 'camion',
        type: 'Test Camion',
        capacitePoids: 3500
      };
      const contenant = new Contenant(contenantData);

      await expect(contenant.save()).rejects.toThrow();
    });

    it('should fail without capacitePoids', async () => {
      const contenantData = {
        matricule: 'TEST-001',
        categorie: 'camion',
        type: 'Test Camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        }
      };
      const contenant = new Contenant(contenantData);

      await expect(contenant.save()).rejects.toThrow();
    });

    it('should fail with invalid categorie', async () => {
      const contenantData = {
        matricule: 'TEST-001',
        categorie: 'invalid',
        type: 'Test Camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        },
        capacitePoids: 3500
      };
      const contenant = new Contenant(contenantData);

      await expect(contenant.save()).rejects.toThrow();
    });

    it('should fail with duplicate matricule', async () => {
      const contenantData = { ...testContenants[0] };
      const contenant1 = new Contenant(contenantData);
      await contenant1.save();

      const contenant2 = new Contenant(contenantData);
      await expect(contenant2.save()).rejects.toThrow();
    });
  });

  describe('Contenant Properties', () => {
    it('should store images array', async () => {
      const contenantData = {
        ...testContenants[0],
        images: ['/uploads/image1.jpg', '/uploads/image2.jpg']
      };
      const contenant = new Contenant(contenantData);
      const savedContenant = await contenant.save();

      expect(savedContenant.images).toHaveLength(2);
      expect(savedContenant.images[0]).toBe('/uploads/image1.jpg');
    });

    it('should set default disponible to true', async () => {
      const contenantData = {
        matricule: 'TEST-001',
        categorie: 'camion',
        type: 'Test Camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        },
        capacitePoids: 3500
      };
      const contenant = new Contenant(contenantData);
      const savedContenant = await contenant.save();

      expect(savedContenant.disponible).toBe(true);
    });

    it('should allow setting disponible to false', async () => {
      const contenantData = {
        ...testContenants[0],
        disponible: false
      };
      const contenant = new Contenant(contenantData);
      const savedContenant = await contenant.save();

      expect(savedContenant.disponible).toBe(false);
    });
  });

  describe('Contenant Dimensions', () => {
    it('should store complete dimensions', async () => {
      const contenantData = { ...testContenants[0] };
      const contenant = new Contenant(contenantData);
      const savedContenant = await contenant.save();

      expect(savedContenant.dimensions.longueur).toBe(400);
      expect(savedContenant.dimensions.largeur).toBe(200);
      expect(savedContenant.dimensions.hauteur).toBe(250);
    });

    it('should fail with incomplete dimensions', async () => {
      const contenantData = {
        matricule: 'TEST-001',
        categorie: 'camion',
        type: 'Test Camion',
        dimensions: {
          longueur: 400,
          largeur: 200
          // hauteur missing
        },
        capacitePoids: 3500
      };
      const contenant = new Contenant(contenantData);

      await expect(contenant.save()).rejects.toThrow();
    });
  });

  describe('Timestamps', () => {
    it('should add createdAt and updatedAt timestamps', async () => {
      const contenantData = { ...testContenants[0] };
      const contenant = new Contenant(contenantData);
      const savedContenant = await contenant.save();

      expect(savedContenant.createdAt).toBeInstanceOf(Date);
      expect(savedContenant.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const contenantData = { ...testContenants[0] };
      const contenant = new Contenant(contenantData);
      const savedContenant = await contenant.save();
      const originalUpdatedAt = savedContenant.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedContenant.disponible = false;
      const updatedContenant = await savedContenant.save();

      expect(updatedContenant.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
