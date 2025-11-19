/**
 * User Model Tests
 * Tests for User schema, validation, and methods
 */

const User = require('../../models/User');
const { db } = require('../../config/database');

// Mock the database module
jest.mock('../../config/database', () => {
  const mockDb = {
    generateUUID: jest.fn(() => 'mock-uuid-' + Date.now()),
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    query: jest.fn()
  };

  return {
    db: mockDb
  };
});

describe('User Model', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    test('should create a valid user with required fields', async() => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        businessName: 'John Doe',
        phone: '+15551234567',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'USA'
        }
      };

      const mockCreatedUser = {
        id: 'mock-uuid-123',
        email: 'test@example.com',
        password: '$2a$10$hashedpassword',
        businessName: 'John Doe',
        phone: '+15551234567',
        address: JSON.stringify(userData.address),
        kycStatus: 'pending',
        isActive: true,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreatedUser);

      const user = await User.create(userData);

      expect(db.create).toHaveBeenCalledWith('users', expect.objectContaining({
        email: 'test@example.com',
        businessName: 'John Doe',
        phone: '+15551234567',
        kycStatus: 'pending'
      }));
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.businessName).toBe(userData.businessName);
      expect(user.password).not.toBe(userData.password); // Should be hashed
      expect(user.kycStatus).toBe('pending'); // Default value
    });

    test('should fail when required fields are missing', async() => {
      const userData = {
        email: 'test@example.com'
        // Missing password
      };

      await expect(User.create(userData)).rejects.toThrow('Password must be at least 8 characters long');
    });

    test('should fail with invalid email format', async() => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        businessName: 'John Doe',
        phone: '+15551234567'
      };

      await expect(User.create(userData)).rejects.toThrow('is not a valid email address');
    });

    test('should fail with duplicate email', async() => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        businessName: 'John Doe',
        phone: '+15551234567'
      };

      const mockUser = {
        id: 'existing-user-id',
        email: 'test@example.com',
        password: '$2a$10$hashedpassword',
        businessName: 'John Doe',
        phone: '+15551234567',
        kycStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // First creation succeeds
      db.create.mockResolvedValueOnce(mockUser);
      await User.create(userData);

      // Second creation should fail (simulate unique constraint)
      db.create.mockRejectedValueOnce(new Error('Duplicate entry for key \'email\''));
      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    test('should hash password before saving', async() => {
      const password = 'PlainTextPassword123!';
      const userData = {
        email: 'hash@test.com',
        password,
        businessName: 'Hash Test',
        phone: '+15551234567'
      };

      const mockCreatedUser = {
        id: 'mock-uuid-hash',
        email: 'hash@test.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        businessName: 'Hash Test',
        phone: '+15551234567',
        kycStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreatedUser);

      const user = await User.create(userData);
      
      expect(user.password).not.toBe(password);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format
    });

    test('should not rehash password if not modified', async() => {
      const mockUser = {
        id: 'existing-user',
        email: 'nohash@test.com',
        password: '$2a$10$originalHashedPassword',
        businessName: 'No Hash',
        phone: '+15551234567',
        kycStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.findById.mockResolvedValue(mockUser);
      db.update.mockResolvedValue({
        ...mockUser,
        businessName: 'Updated',
        updatedAt: new Date()
      });

      const user = await User.findById('existing-user');
      const firstHash = user.password;

      user.businessName = 'Updated';
      await user.save();

      // Password should remain unchanged in the update
      const updateCall = db.update.mock.calls[0];
      expect(updateCall[0]).toBe('users'); // table name
      expect(updateCall[1]).toBe('existing-user'); // id
      expect(updateCall[2].password).toBe(firstHash); // password unchanged
    });
  });

  describe('comparePassword Method', () => {
    test('should return true for correct password', async() => {
      const password = 'CorrectPassword123!';
      const userData = {
        email: 'compare@test.com',
        password,
        businessName: 'Compare Test',
        phone: '+15551234567'
      };

      // Using actual bcrypt hash of 'CorrectPassword123!'
      const mockCreatedUser = {
        id: 'mock-uuid-compare',
        email: 'compare@test.com',
        password: '$2a$10$Of4kCgrTFy2TkZmaXPAO7uB0IoxIC44h8zoOTlZ3Wy80N7H4tvreO',
        businessName: 'Compare Test',
        phone: '+15551234567',
        kycStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreatedUser);

      const user = await User.create(userData);
      const userInstance = new User(user);

      const isMatch = await userInstance.comparePassword(password);
      expect(isMatch).toBe(true);
    });

    test('should return false for incorrect password', async() => {
      const userData = {
        email: 'compare2@test.com',
        password: 'CorrectPassword123!',
        businessName: 'Compare Test',
        phone: '+15551234567'
      };

      const mockCreatedUser = {
        id: 'mock-uuid-compare2',
        email: 'compare2@test.com',
        password: '$2a$10$Of4kCgrTFy2TkZmaXPAO7uB0IoxIC44h8zoOTlZ3Wy80N7H4tvreO',
        businessName: 'Compare Test',
        phone: '+15551234567',
        kycStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreatedUser);

      const user = await User.create(userData);
      const userInstance = new User(user);

      const isMatch = await userInstance.comparePassword('WrongPassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('toJSON Method', () => {
    test('should not include password in JSON output', async() => {
      const mockUser = {
        id: 'json-user-id',
        email: 'json@test.com',
        password: '$2a$10$hashedpassword',
        businessName: 'JSON Test',
        phone: '+15551234567',
        kycStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user = new User(mockUser);
      const userJSON = user.toJSON();

      expect(userJSON.password).toBeUndefined();
      expect(userJSON.email).toBe('json@test.com');
      expect(userJSON.id).toBe('json-user-id');
    });
  });

  describe('KYC Status', () => {
    test('should have default KYC status as pending', async() => {
      const userData = {
        email: 'kyc@test.com',
        password: 'SecurePass123!',
        businessName: 'KYC Test',
        phone: '+15551234567'
      };

      const mockCreatedUser = {
        id: 'kyc-user-id',
        email: 'kyc@test.com',
        password: '$2a$10$hashedpassword',
        businessName: 'KYC Test',
        phone: '+15551234567',
        kycStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreatedUser);

      const user = await User.create(userData);
      expect(user.kycStatus).toBe('pending');
    });

    test('should accept valid KYC status values', async() => {
      const statuses = ['pending', 'submitted', 'approved', 'rejected'];

      for (const status of statuses) {
        const userData = {
          email: `kyc-${status}@test.com`,
          password: 'SecurePass123!',
          businessName: 'KYC Test',
          phone: '+15551234567',
          kycStatus: status
        };

        const mockCreatedUser = {
          id: `kyc-user-${status}`,
          email: `kyc-${status}@test.com`,
          password: '$2a$10$hashedpassword',
          businessName: 'KYC Test',
          phone: '+15551234567',
          kycStatus: status,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        db.create.mockResolvedValue(mockCreatedUser);

        const user = await User.create(userData);
        expect(user.kycStatus).toBe(status);
      }
    });
  });

  describe('Timestamps', () => {
    test('should automatically add createdAt and updatedAt', async() => {
      const userData = {
        email: 'timestamp@test.com',
        password: 'SecurePass123!',
        businessName: 'Timestamp Test',
        phone: '+15551234567'
      };

      const mockCreatedUser = {
        id: 'timestamp-user-id',
        email: 'timestamp@test.com',
        password: '$2a$10$hashedpassword',
        businessName: 'Timestamp Test',
        phone: '+15551234567',
        kycStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreatedUser);

      const user = await User.create(userData);

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt on modification', async() => {
      const firstUpdatedAt = new Date('2024-01-01T00:00:00.000Z');
      const secondUpdatedAt = new Date('2024-01-01T00:01:00.000Z');

      const mockUser = {
        id: 'update-user-id',
        email: 'update@test.com',
        password: '$2a$10$hashedpassword',
        businessName: 'Update Test',
        phone: '+15551234567',
        kycStatus: 'pending',
        createdAt: firstUpdatedAt,
        updatedAt: firstUpdatedAt
      };

      db.findById.mockResolvedValue(mockUser);
      db.update.mockResolvedValue({
        ...mockUser,
        businessName: 'Updated',
        updatedAt: secondUpdatedAt
      });

      const user = await User.findById('update-user-id');
      const firstTime = user.updatedAt;

      user.businessName = 'Updated';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(firstTime.getTime());
    });
  });
});
