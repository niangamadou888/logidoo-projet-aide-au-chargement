const authController = require('../../controllers/authController');
const User = require('../../models/User');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testUsers } = require('../fixtures/testData');

describe('AuthController', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const req = {
        body: {
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User registered successfully',
          token: expect.any(String),
          user: expect.objectContaining({
            username: 'newuser',
            email: 'newuser@test.com',
            role: 'user'
          })
        })
      );
    });

    it('should fail when user with same email exists', async () => {
      const existingUser = new User(testUsers.user);
      await existingUser.save();

      const req = {
        body: {
          username: 'differentuser',
          email: testUsers.user.email,
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email or username already exists'
      });
    });

    it('should fail when user with same username exists', async () => {
      const existingUser = new User(testUsers.user);
      await existingUser.save();

      const req = {
        body: {
          username: testUsers.user.username,
          email: 'different@test.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email or username already exists'
      });
    });

    it('should set role to user by default', async () => {
      const req = {
        body: {
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.register(req, res);

      const user = await User.findOne({ email: 'newuser@test.com' });
      expect(user.role).toBe('user');
    });
  });

  describe('login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = new User(testUsers.user);
      await testUser.save();
    });

    it('should login successfully with valid credentials', async () => {
      const req = {
        body: {
          email: testUsers.user.email,
          password: testUsers.user.password
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          token: expect.any(String),
          user: expect.objectContaining({
            email: testUsers.user.email,
            username: testUsers.user.username,
            role: 'user'
          })
        })
      );
    });

    it('should fail with non-existent email', async () => {
      const req = {
        body: {
          email: 'nonexistent@test.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should fail with wrong password', async () => {
      const req = {
        body: {
          email: testUsers.user.email,
          password: 'wrongpassword'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should fail for inactive user', async () => {
      const inactiveUser = new User(testUsers.inactiveUser);
      await inactiveUser.save();

      const req = {
        body: {
          email: testUsers.inactiveUser.email,
          password: testUsers.inactiveUser.password
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is disabled'
      });
    });
  });

  describe('getCurrentUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = new User(testUsers.user);
      await testUser.save();
    });

    it('should return current user info', async () => {
      const req = {
        user: { id: testUser._id }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: testUser._id,
          username: testUser.username,
          email: testUser.email,
          role: testUser.role
        })
      });
    });

    it('should fail if user not found', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const req = {
        user: { id: fakeId }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('getAllUsers', () => {
    let adminUser;
    let regularUser;

    beforeEach(async () => {
      adminUser = new User(testUsers.admin);
      await adminUser.save();

      regularUser = new User(testUsers.user);
      await regularUser.save();
    });

    it('should return all users for admin', async () => {
      const req = {
        user: { id: adminUser._id, role: 'admin' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        users: expect.arrayContaining([
          expect.objectContaining({
            username: adminUser.username,
            email: adminUser.email
          }),
          expect.objectContaining({
            username: regularUser.username,
            email: regularUser.email
          })
        ])
      });
    });

    it('should fail for non-admin user', async () => {
      const req = {
        user: { id: regularUser._id, role: 'user' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Admin only.'
      });
    });

    it('should not include password in user data', async () => {
      const req = {
        user: { id: adminUser._id, role: 'admin' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.getAllUsers(req, res);

      const responseData = res.json.mock.calls[0][0];
      responseData.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });
  });

  describe('forgotPassword', () => {
    let testUser;

    beforeEach(async () => {
      testUser = new User(testUsers.user);
      await testUser.save();
    });

    it('should generate reset token for existing user', async () => {
      const req = {
        body: { email: testUsers.user.email }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'If an account exists, a reset link was sent'
        })
      );

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.resetPasswordToken).toBeTruthy();
      expect(updatedUser.resetPasswordExpires).toBeInstanceOf(Date);
    });

    it('should return success even for non-existent email', async () => {
      const req = {
        body: { email: 'nonexistent@test.com' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'If an account exists, a reset link was sent'
        })
      );
    });

    it('should fail without email', async () => {
      const req = {
        body: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email is required'
      });
    });
  });

  describe('resetPassword', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      testUser = new User(testUsers.user);
      validToken = 'test-reset-token-123';
      testUser.resetPasswordToken = validToken;
      testUser.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour from now
      await testUser.save();
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'newpassword123';
      const req = {
        body: {
          token: validToken,
          password: newPassword
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password has been reset successfully'
      });

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.resetPasswordToken).toBeNull();
      expect(updatedUser.resetPasswordExpires).toBeNull();

      const isValid = await updatedUser.comparePassword(newPassword);
      expect(isValid).toBe(true);
    });

    it('should fail with invalid token', async () => {
      const req = {
        body: {
          token: 'invalid-token',
          password: 'newpassword123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset token'
      });
    });

    it('should fail with expired token', async () => {
      testUser.resetPasswordExpires = new Date(Date.now() - 3600000); // 1 hour ago
      await testUser.save();

      const req = {
        body: {
          token: validToken,
          password: 'newpassword123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset token'
      });
    });

    it('should fail without token', async () => {
      const req = {
        body: {
          password: 'newpassword123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token and new password are required'
      });
    });

    it('should fail without password', async () => {
      const req = {
        body: {
          token: validToken
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token and new password are required'
      });
    });
  });
});
