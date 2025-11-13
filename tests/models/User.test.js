/**
 * User Model Tests
 * Tests for User schema, validation, and methods
 */

const mongoose = require('mongoose');
const User = require('../../models/User');

describe('User Model', () => {
  // Setup: Connect to test database
  beforeAll(async() => {
    await mongoose.connect(process.env.MONGODB_URI);
  }, 30000);

  // Cleanup: Clear database and close connection
  afterAll(async() => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  }, 30000);

  // Clear users before each test
  beforeEach(async() => {
    await User.deleteMany({});
  });

  describe('Schema Validation', () => {
    test('should create a valid user with required fields', async() => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15551234567',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'USA'
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
      expect(savedUser.kycStatus).toBe('pending'); // Default value
    });

    test('should fail when required fields are missing', async() => {
      const user = new User({
        email: 'test@example.com'
        // Missing required fields
      });

      await expect(user.save()).rejects.toThrow();
    });

    test('should fail with invalid email format', async() => {
      const user = new User({
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15551234567'
      });

      await expect(user.save()).rejects.toThrow();
    });

    test('should fail with duplicate email', async() => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15551234567'
      };

      await new User(userData).save();

      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    test('should hash password before saving', async() => {
      const password = 'PlainTextPassword123!';
      const user = new User({
        email: 'hash@test.com',
        password,
        firstName: 'Hash',
        lastName: 'Test',
        phone: '+15551234567'
      });

      await user.save();
      expect(user.password).not.toBe(password);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format
    });

    test('should not rehash password if not modified', async() => {
      const user = new User({
        email: 'nohash@test.com',
        password: 'Password123!',
        firstName: 'No',
        lastName: 'Hash',
        phone: '+15551234567'
      });

      await user.save();
      const firstHash = user.password;

      user.firstName = 'Updated';
      await user.save();

      expect(user.password).toBe(firstHash);
    });
  });

  describe('comparePassword Method', () => {
    test('should return true for correct password', async() => {
      const password = 'CorrectPassword123!';
      const user = new User({
        email: 'compare@test.com',
        password,
        firstName: 'Compare',
        lastName: 'Test',
        phone: '+15551234567'
      });

      await user.save();

      const isMatch = await user.comparePassword(password);
      expect(isMatch).toBe(true);
    });

    test('should return false for incorrect password', async() => {
      const user = new User({
        email: 'compare2@test.com',
        password: 'CorrectPassword123!',
        firstName: 'Compare',
        lastName: 'Test',
        phone: '+15551234567'
      });

      await user.save();

      const isMatch = await user.comparePassword('WrongPassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('toJSON Method', () => {
    test('should not include password in JSON output', async() => {
      const user = new User({
        email: 'json@test.com',
        password: 'SecurePass123!',
        firstName: 'JSON',
        lastName: 'Test',
        phone: '+15551234567'
      });

      await user.save();

      const userJSON = user.toJSON();
      expect(userJSON.password).toBeUndefined();
      expect(userJSON.email).toBe('json@test.com');
    });
  });

  describe('KYC Status', () => {
    test('should have default KYC status as pending', async() => {
      const user = new User({
        email: 'kyc@test.com',
        password: 'SecurePass123!',
        firstName: 'KYC',
        lastName: 'Test',
        phone: '+15551234567'
      });

      await user.save();
      expect(user.kycStatus).toBe('pending');
    });

    test('should accept valid KYC status values', async() => {
      const statuses = ['pending', 'submitted', 'approved', 'rejected'];

      for (const status of statuses) {
        const user = new User({
          email: `kyc-${status}@test.com`,
          password: 'SecurePass123!',
          firstName: 'KYC',
          lastName: 'Test',
          phone: '+15551234567',
          kycStatus: status
        });

        await user.save();
        expect(user.kycStatus).toBe(status);
      }
    });
  });

  describe('Timestamps', () => {
    test('should automatically add createdAt and updatedAt', async() => {
      const user = new User({
        email: 'timestamp@test.com',
        password: 'SecurePass123!',
        firstName: 'Timestamp',
        lastName: 'Test',
        phone: '+15551234567'
      });

      await user.save();

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt on modification', async() => {
      const user = new User({
        email: 'update@test.com',
        password: 'SecurePass123!',
        firstName: 'Update',
        lastName: 'Test',
        phone: '+15551234567'
      });

      await user.save();
      const firstUpdatedAt = user.updatedAt;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 100));
      user.firstName = 'Updated';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(firstUpdatedAt.getTime());
    });
  });
});
