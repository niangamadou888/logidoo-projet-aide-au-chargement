const jwt = require('jsonwebtoken');
const { authenticate, authorize, authorizeAdmin } = require('../../middleware/auth');
const User = require('../../models/User');
const authConfig = require('../../config/auth');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testUsers } = require('../fixtures/testData');

describe('Auth Middleware', () => {
  let testUser;
  let testAdmin;
  let validToken;
  let adminToken;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create test users
    testUser = new User(testUsers.user);
    await testUser.save();

    testAdmin = new User(testUsers.admin);
    await testAdmin.save();

    // Generate valid tokens
    validToken = jwt.sign(
      { id: testUser._id, role: testUser.role },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiresIn }
    );

    adminToken = jwt.sign(
      { id: testAdmin._id, role: testAdmin.role },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiresIn }
    );
  });

  describe('authenticate middleware', () => {
    it('should authenticate valid token in Authorization header', async () => {
      const req = {
        header: jest.fn((headerName) => {
          if (headerName === 'Authorization') {
            return `Bearer ${validToken}`;
          }
          return null;
        })
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(testUser._id.toString());
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      const req = {
        header: jest.fn(() => null),
        cookies: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });

    it('should reject invalid token', async () => {
      const req = {
        header: jest.fn((headerName) => {
          if (headerName === 'Authorization') {
            return 'Bearer invalid-token';
          }
          return null;
        })
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed'
      });
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id, role: testUser.role },
        authConfig.jwtSecret,
        { expiresIn: '-1h' }
      );

      const req = {
        header: jest.fn((headerName) => {
          if (headerName === 'Authorization') {
            return `Bearer ${expiredToken}`;
          }
          return null;
        })
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject token for inactive user', async () => {
      const inactiveUser = new User(testUsers.inactiveUser);
      await inactiveUser.save();

      const inactiveToken = jwt.sign(
        { id: inactiveUser._id, role: inactiveUser.role },
        authConfig.jwtSecret,
        { expiresIn: authConfig.jwtExpiresIn }
      );

      const req = {
        header: jest.fn((headerName) => {
          if (headerName === 'Authorization') {
            return `Bearer ${inactiveToken}`;
          }
          return null;
        })
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired authentication'
      });
    });

    it('should not include password in req.user', async () => {
      const req = {
        header: jest.fn((headerName) => {
          if (headerName === 'Authorization') {
            return `Bearer ${validToken}`;
          }
          return null;
        })
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(req.user.password).toBeUndefined();
    });
  });

  describe('authorize middleware', () => {
    it('should allow user with correct role', () => {
      const req = {
        user: { role: 'admin' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow user with one of multiple roles', () => {
      const req = {
        user: { role: 'user' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = authorize('admin', 'user');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject user with incorrect role', () => {
      const req = {
        user: { role: 'user' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied: insufficient permissions'
      });
    });

    it('should reject request without user', () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });
  });

  describe('authorizeAdmin middleware', () => {
    it('should allow admin user', () => {
      const req = {
        user: { role: 'admin' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      authorizeAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject non-admin user', () => {
      const req = {
        user: { role: 'user' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      authorizeAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied: admin privileges required'
      });
    });

    it('should reject request without user', () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      authorizeAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });
  });
});
