const User = require('../../models/User');
const { setupTestDatabase, teardownTestDatabase, clearDatabase } = require('../setup');
const { testUsers } = require('../fixtures/testData');

describe('User Model', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('User Creation', () => {
    it('should create a valid user', async () => {
      const userData = { ...testUsers.user };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe('user');
      expect(savedUser.active).toBe(true);
      expect(savedUser.password).not.toBe(userData.password); // Password should be hashed
    });

    it('should create an admin user', async () => {
      const adminData = { ...testUsers.admin };
      const user = new User(adminData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe('admin');
    });

    it('should set default role to user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe('user');
    });

    it('should set default active to true', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.active).toBe(true);
    });
  });

  describe('User Validation', () => {
    it('should fail without username', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail without email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123'
      };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail without password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com'
      };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail with invalid email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail with duplicate email', async () => {
      const userData = { ...testUsers.user };
      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should fail with duplicate username', async () => {
      const userData1 = { ...testUsers.user };
      const user1 = new User(userData1);
      await user1.save();

      const userData2 = {
        username: userData1.username,
        email: 'different@example.com',
        password: 'password123'
      };
      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should fail with username less than 3 characters', async () => {
      const userData = {
        username: 'ab',
        email: 'test@example.com',
        password: 'password123'
      };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail with password less than 6 characters', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '12345'
      };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const userData = { ...testUsers.user };
      const plainPassword = userData.password;
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe(plainPassword);
      expect(savedUser.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('should not rehash password if not modified', async () => {
      const userData = { ...testUsers.user };
      const user = new User(userData);
      const savedUser = await user.save();
      const originalHash = savedUser.password;

      savedUser.username = 'updatedusername';
      const updatedUser = await savedUser.save();

      expect(updatedUser.password).toBe(originalHash);
    });
  });

  describe('Password Comparison', () => {
    it('should validate correct password', async () => {
      const userData = { ...testUsers.user };
      const plainPassword = userData.password;
      const user = new User(userData);
      const savedUser = await user.save();

      const isValid = await savedUser.comparePassword(plainPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const userData = { ...testUsers.user };
      const user = new User(userData);
      const savedUser = await user.save();

      const isValid = await savedUser.comparePassword('wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('User Role', () => {
    it('should only accept valid roles', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalidrole'
      };
      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should accept admin role', async () => {
      const userData = {
        username: 'testadmin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe('admin');
    });
  });

  describe('Reset Password Token', () => {
    it('should store reset password token', async () => {
      const userData = { ...testUsers.user };
      const user = new User(userData);
      const savedUser = await user.save();

      savedUser.resetPasswordToken = 'test-token-123';
      savedUser.resetPasswordExpires = new Date(Date.now() + 3600000);
      const updatedUser = await savedUser.save();

      expect(updatedUser.resetPasswordToken).toBe('test-token-123');
      expect(updatedUser.resetPasswordExpires).toBeInstanceOf(Date);
    });
  });
});
