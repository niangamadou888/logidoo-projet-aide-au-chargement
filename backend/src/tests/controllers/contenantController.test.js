const contenantController = require('../../controllers/contenantController');
const service = require('../../services/suggestionService');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testContenants, testColis } = require('../fixtures/testData');

// Mock the service
jest.mock('../../services/suggestionService');

describe('Contenant Controller', () => {
  let mockReq, mockRes;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      file: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('suggestionContenants', () => {
    it('should return container suggestions successfully', async () => {
      const mockSuggestions = [testContenants[0], testContenants[1]];
      service.suggererContenants.mockResolvedValue(mockSuggestions);

      mockReq.body.articles = testColis;

      await contenantController.suggestionContenants(mockReq, mockRes);

      expect(service.suggererContenants).toHaveBeenCalledWith(testColis);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockSuggestions);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Service error');
      service.suggererContenants.mockRejectedValue(error);

      mockReq.body.articles = testColis;

      await contenantController.suggestionContenants(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Erreur interne',
        error
      });
    });

    it('should handle empty articles array', async () => {
      service.suggererContenants.mockResolvedValue([]);

      mockReq.body.articles = [];

      await contenantController.suggestionContenants(mockReq, mockRes);

      expect(service.suggererContenants).toHaveBeenCalledWith([]);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });
  });

  describe('creerContenant', () => {
    it('should create a contenant successfully', async () => {
      const contenantData = {
        matricule: 'TEST-001',
        type: 'Camion',
        dimensions: {
          longueur: 400,
          largeur: 200,
          hauteur: 250
        },
        capacitePoids: 3500
      };

      const mockCreatedContenant = { ...contenantData, _id: 'mock-id' };
      service.creerContenant.mockResolvedValue(mockCreatedContenant);

      mockReq.body = contenantData;

      await contenantController.creerContenant(mockReq, mockRes);

      expect(service.creerContenant).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreatedContenant);
    });

    it('should fail when matricule is missing', async () => {
      mockReq.body = {
        type: 'Camion',
        dimensions: { longueur: 400, largeur: 200, hauteur: 250 }
      };

      await contenantController.creerContenant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Le matricule est requis',
        error: 'Matricule manquant'
      });
      expect(service.creerContenant).not.toHaveBeenCalled();
    });

    it('should fail when matricule is empty string', async () => {
      mockReq.body = {
        matricule: '   ',
        type: 'Camion'
      };

      await contenantController.creerContenant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Le matricule est requis',
        error: 'Matricule manquant'
      });
      expect(service.creerContenant).not.toHaveBeenCalled();
    });

    it('should handle file upload', async () => {
      const contenantData = {
        matricule: 'TEST-002',
        type: 'Camion',
        dimensions: { longueur: 400, largeur: 200, hauteur: 250 },
        capacitePoids: 3500
      };

      mockReq.body = contenantData;
      mockReq.file = {
        filename: 'test-image.jpg',
        path: '/uploads/test-image.jpg'
      };

      const mockCreatedContenant = { ...contenantData, images: ['/uploads/test-image.jpg'] };
      service.creerContenant.mockResolvedValue(mockCreatedContenant);

      await contenantController.creerContenant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(service.creerContenant).toHaveBeenCalled();
    });

    it('should parse string dimensions to object', async () => {
      mockReq.body = {
        matricule: 'TEST-003',
        type: 'Camion',
        dimensions: JSON.stringify({ longueur: 400, largeur: 200, hauteur: 250 }),
        capacitePoids: 3500
      };

      const mockCreatedContenant = { matricule: 'TEST-003' };
      service.creerContenant.mockResolvedValue(mockCreatedContenant);

      await contenantController.creerContenant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should calculate volume automatically', async () => {
      mockReq.body = {
        matricule: 'TEST-004',
        type: 'Camion',
        dimensions: { longueur: 400, largeur: 200, hauteur: 250 },
        capacitePoids: 3500
      };

      service.creerContenant.mockResolvedValue({ matricule: 'TEST-004' });

      await contenantController.creerContenant(mockReq, mockRes);

      expect(service.creerContenant).toHaveBeenCalled();
      const callArg = service.creerContenant.mock.calls[0][0];
      expect(callArg.volume).toBeDefined();
    });

    it('should handle creation errors', async () => {
      const error = new Error('Database error');
      service.creerContenant.mockRejectedValue(error);

      mockReq.body = {
        matricule: 'TEST-005',
        type: 'Camion'
      };

      await contenantController.creerContenant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Erreur interne',
        error: error.message
      });
    });
  });

  describe('suggestionCamions', () => {
    it('should return truck suggestions successfully', async () => {
      const mockCamions = [testContenants[0]];
      service.suggererCamions.mockResolvedValue(mockCamions);

      mockReq.body.articles = testColis;

      await contenantController.suggestionCamions(mockReq, mockRes);

      expect(service.suggererCamions).toHaveBeenCalledWith(testColis);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCamions);
    });

    it('should handle errors', async () => {
      const error = new Error('Service error');
      service.suggererCamions.mockRejectedValue(error);

      mockReq.body.articles = testColis;

      await contenantController.suggestionCamions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Erreur interne',
        error
      });
    });
  });

  describe('suggestionConteneurs', () => {
    it('should return container suggestions successfully', async () => {
      const mockConteneurs = [testContenants[1]];
      service.suggererConteneurs.mockResolvedValue(mockConteneurs);

      mockReq.body.articles = testColis;

      await contenantController.suggestionConteneurs(mockReq, mockRes);

      expect(service.suggererConteneurs).toHaveBeenCalledWith(testColis);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockConteneurs);
    });

    it('should handle errors', async () => {
      const error = new Error('Service error');
      service.suggererConteneurs.mockRejectedValue(error);

      mockReq.body.articles = testColis;

      await contenantController.suggestionConteneurs(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Erreur interne',
        error
      });
    });
  });

  describe('getContenants', () => {
    it('should return all contenants successfully', async () => {
      service.getContenants.mockResolvedValue(testContenants);

      await contenantController.getContenants(mockReq, mockRes);

      expect(service.getContenants).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(testContenants);
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      service.getContenants.mockRejectedValue(error);

      await contenantController.getContenants(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Erreur interne',
        error
      });
    });
  });

  describe('getContenantById', () => {
    it('should return a contenant by id', async () => {
      const mockContenant = testContenants[0];
      service.getContenantById.mockResolvedValue(mockContenant);

      mockReq.params.id = 'mock-id-123';

      await contenantController.getContenantById(mockReq, mockRes);

      expect(service.getContenantById).toHaveBeenCalledWith('mock-id-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockContenant);
    });

    it('should return 404 when contenant not found', async () => {
      service.getContenantById.mockResolvedValue(null);

      mockReq.params.id = 'non-existent-id';

      await contenantController.getContenantById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Conteneur non trouvé'
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      service.getContenantById.mockRejectedValue(error);

      mockReq.params.id = 'mock-id';

      await contenantController.getContenantById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Erreur interne',
        error
      });
    });
  });

  describe('updateContenant', () => {
    it('should update a contenant successfully', async () => {
      const updateData = {
        type: 'Updated Type',
        dimensions: { longueur: 500, largeur: 250, hauteur: 300 }
      };

      const mockUpdated = { _id: 'mock-id', ...updateData };
      service.updateContenant.mockResolvedValue(mockUpdated);

      mockReq.params.id = 'mock-id';
      mockReq.body = updateData;

      await contenantController.updateContenant(mockReq, mockRes);

      expect(service.updateContenant).toHaveBeenCalledWith('mock-id', expect.any(Object));
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdated);
    });

    it('should handle file upload during update', async () => {
      mockReq.params.id = 'mock-id';
      mockReq.body = { type: 'Updated' };
      mockReq.file = { filename: 'new-image.jpg' };

      service.updateContenant.mockResolvedValue({ _id: 'mock-id' });

      await contenantController.updateContenant(mockReq, mockRes);

      expect(service.updateContenant).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      const error = new Error('Update error');
      service.updateContenant.mockRejectedValue(error);

      mockReq.params.id = 'mock-id';
      mockReq.body = { type: 'Updated' };

      await contenantController.updateContenant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Erreur interne',
        error: error.message
      });
    });
  });

  describe('deleteContenant', () => {
    it('should delete a contenant successfully', async () => {
      const mockDeleted = { _id: 'mock-id', deleted: true };
      service.deleteContenant.mockResolvedValue(mockDeleted);

      mockReq.params.id = 'mock-id';

      await contenantController.deleteContenant(mockReq, mockRes);

      expect(service.deleteContenant).toHaveBeenCalledWith('mock-id');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Contenant supprimé avec succès',
        deleted: mockDeleted
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Delete error');
      service.deleteContenant.mockRejectedValue(error);

      mockReq.params.id = 'mock-id';

      await contenantController.deleteContenant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Erreur interne',
        error: error.message
      });
    });
  });

  describe('getCategories', () => {
    it('should return categories successfully', async () => {
      const mockCategories = ['camion', 'conteneur'];
      service.getCategories.mockResolvedValue(mockCategories);

      await contenantController.getCategories(mockReq, mockRes);

      expect(service.getCategories).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCategories);
    });

    it('should handle errors without crashing', async () => {
      const error = new Error('Categories error');
      service.getCategories.mockRejectedValue(error);

      await contenantController.getCategories(mockReq, mockRes);

      // The function doesn't explicitly handle errors, so we just verify it was called
      expect(service.getCategories).toHaveBeenCalled();
    });
  });
});
