/**
 * Card Model Tests
 * Tests for Card schema, encryption/decryption, and validation
 */

const mongoose = require('mongoose');
const Card = require('../../models/Card');

describe('Card Model', () => {
  const testUserId = new mongoose.Types.ObjectId();

  beforeAll(async() => {
    await mongoose.connect(process.env.MONGODB_URI);
  }, 30000);

  afterAll(async() => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  }, 30000);

  beforeEach(async() => {
    await Card.deleteMany({});
  });

  describe('Schema Validation', () => {
    test('should create a valid card with required fields', async() => {
      const cardData = {
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted_data_here'
      };

      const card = new Card(cardData);
      const savedCard = await card.save();

      expect(savedCard._id).toBeDefined();
      expect(savedCard.userId.toString()).toBe(testUserId.toString());
      expect(savedCard.cardholderName).toBe(cardData.cardholderName);
      expect(savedCard.isActive).toBe(true); // Default value
      expect(savedCard.isDefault).toBe(false); // Default value
    });

    test('should fail when required fields are missing', async() => {
      const card = new Card({
        userId: testUserId
        // Missing required fields
      });

      await expect(card.save()).rejects.toThrow();
    });

    test('should validate expiry month range', async() => {
      const card = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '13', // Invalid
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted'
      });

      await expect(card.save()).rejects.toThrow();
    });

    test('should validate card type enum', async() => {
      const validTypes = ['visa', 'mastercard', 'amex', 'discover'];

      for (const type of validTypes) {
        const card = new Card({
          userId: testUserId,
          cardholderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2025',
          cardType: type,
          lastFourDigits: '1111',
          cardNumberEncrypted: 'encrypted'
        });

        const saved = await card.save();
        expect(saved.cardType).toBe(type);
        await Card.deleteMany({});
      }
    });
  });

  describe('Encryption/Decryption', () => {
    test('should encrypt card number', () => {
      const card = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111'
      });

      const cardNumber = '4111111111111111';
      const encrypted = card.encryptCardNumber(cardNumber);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(cardNumber);
      expect(encrypted.length).toBeGreaterThan(0);
      // Encrypted format: iv:encryptedData
      expect(encrypted).toMatch(/^[a-f0-9]{32}:[a-f0-9]+$/);
    });

    test('should decrypt card number correctly', () => {
      const card = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111'
      });

      const originalCardNumber = '4111111111111111';
      const encrypted = card.encryptCardNumber(originalCardNumber);
      card.cardNumberEncrypted = encrypted;

      const decrypted = card.decryptCardNumber();

      expect(decrypted).toBe(originalCardNumber);
    });

    test('should generate different encrypted values for same input', () => {
      const card = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111'
      });

      const cardNumber = '4111111111111111';
      const encrypted1 = card.encryptCardNumber(cardNumber);
      const encrypted2 = card.encryptCardNumber(cardNumber);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to original
      card.cardNumberEncrypted = encrypted1;
      expect(card.decryptCardNumber()).toBe(cardNumber);

      card.cardNumberEncrypted = encrypted2;
      expect(card.decryptCardNumber()).toBe(cardNumber);
    });

    test('should handle empty card number gracefully', () => {
      const card = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: ''
      });

      expect(() => card.decryptCardNumber()).toThrow();
    });
  });

  describe('Default Card Management', () => {
    test('should allow only one default card per user', async() => {
      // Create first default card
      const card1 = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted1',
        isDefault: true
      });
      await card1.save();

      // Create second card (not default)
      const card2 = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '06',
        expiryYear: '2026',
        cardType: 'mastercard',
        lastFourDigits: '2222',
        cardNumberEncrypted: 'encrypted2',
        isDefault: false
      });
      await card2.save();

      const cards = await Card.find({ userId: testUserId, isDefault: true });
      expect(cards.length).toBe(1);
      expect(cards[0].lastFourDigits).toBe('1111');
    });
  });

  describe('Card Status', () => {
    test('should default to active status', async() => {
      const card = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted'
      });

      await card.save();
      expect(card.isActive).toBe(true);
    });

    test('should allow deactivation', async() => {
      const card = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted'
      });

      await card.save();

      card.isActive = false;
      await card.save();

      const foundCard = await Card.findById(card._id);
      expect(foundCard.isActive).toBe(false);
    });
  });

  describe('Billing Address', () => {
    test('should store billing address when provided', async() => {
      const billingAddress = {
        street: '456 Oak Ave',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      };

      const card = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted',
        billingAddress
      });

      await card.save();

      expect(card.billingAddress.street).toBe(billingAddress.street);
      expect(card.billingAddress.city).toBe(billingAddress.city);
      expect(card.billingAddress.postalCode).toBe(billingAddress.postalCode);
    });
  });

  describe('Timestamps', () => {
    test('should automatically add createdAt and updatedAt', async() => {
      const card = new Card({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted'
      });

      await card.save();

      expect(card.createdAt).toBeInstanceOf(Date);
      expect(card.updatedAt).toBeInstanceOf(Date);
    });
  });
});
