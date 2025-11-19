/**
 * Card Model Tests
 * Tests for Card schema, encryption/decryption, and validation
 */

const Card = require('../../models/Card');
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

describe('Card Model', () => {
  const testUserId = 'user-uuid-123';

  beforeEach(() => {
    jest.clearAllMocks();
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

      const mockCreated = {
        id: 'card-uuid-123',
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted_data_here',
        status: 'active',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreated);

      const card = await Card.create(cardData);

      expect(card.id).toBeDefined();
      expect(card.userId).toBe(testUserId);
      expect(card.cardholderName).toBe(cardData.cardholderName);
      expect(card.status).toBe('active'); // Default value
      expect(card.isDefault).toBe(false); // Default value
    });

    test('should fail when required fields are missing', async() => {
      const cardData = {
        userId: testUserId
        // Missing required fields
      };

      await expect(Card.create(cardData)).rejects.toThrow();
    });

    test('should validate expiry month range', async() => {
      const cardData = {
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '13', // Invalid
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted'
      };

      await expect(Card.create(cardData)).rejects.toThrow('is not a valid month');
    });

    test('should validate card type enum', async() => {
      const validTypes = ['visa', 'mastercard', 'amex', 'discover'];

      for (const type of validTypes) {
        const mockCreated = {
          id: `card-${type}`,
          userId: testUserId,
          cardholderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2025',
          cardType: type,
          lastFourDigits: '1111',
          cardNumberEncrypted: 'encrypted',
          status: 'active',
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        db.create.mockResolvedValue(mockCreated);

        const card = await Card.create({
          userId: testUserId,
          cardholderName: 'John Doe',
          expiryMonth: '12',
          expiryYear: '2025',
          cardType: type,
          lastFourDigits: '1111',
          cardNumberEncrypted: 'encrypted'
        });

        expect(card.cardType).toBe(type);
      }
    });
  });

  describe('Encryption/Decryption', () => {
    test('should encrypt card number', () => {
      const cardNumber = '4111111111111111';
      const encrypted = Card.encryptCardNumber(cardNumber);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(cardNumber);
      expect(encrypted.length).toBeGreaterThan(0);
      // Encrypted format: iv:encryptedData
      expect(encrypted).toMatch(/^[a-f0-9]{32}:[a-f0-9]+$/);
    });

    test('should decrypt card number correctly', () => {
      const originalCardNumber = '4111111111111111';
      const encrypted = Card.encryptCardNumber(originalCardNumber);
      
      const card = new Card({
        id: 'card-123',
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: encrypted
      });

      const decrypted = card.decryptCardNumber();
      expect(decrypted).toBe(originalCardNumber);
    });

    test('should generate different encrypted values for same input', () => {
      const cardNumber = '4111111111111111';
      const encrypted1 = Card.encryptCardNumber(cardNumber);
      const encrypted2 = Card.encryptCardNumber(cardNumber);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to original
      const card1 = new Card({ cardNumberEncrypted: encrypted1 });
      expect(card1.decryptCardNumber()).toBe(cardNumber);

      const card2 = new Card({ cardNumberEncrypted: encrypted2 });
      expect(card2.decryptCardNumber()).toBe(cardNumber);
    });

    test('should handle empty card number gracefully', () => {
      const card = new Card({
        id: 'card-123',
        userId: testUserId,
        cardNumberEncrypted: ''
      });

      expect(() => card.decryptCardNumber()).toThrow();
    });
  });

  describe('Default Card Management', () => {
    test('should allow only one default card per user', async() => {
      const mockCard1 = {
        id: 'card-1',
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted1',
        isDefault: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockCard2 = {
        id: 'card-2',
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '06',
        expiryYear: '2026',
        cardType: 'mastercard',
        lastFourDigits: '2222',
        cardNumberEncrypted: 'encrypted2',
        isDefault: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValueOnce(mockCard1).mockResolvedValueOnce(mockCard2);
      db.findMany.mockResolvedValue([mockCard1]);

      await Card.create({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted1',
        isDefault: true
      });

      await Card.create({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '06',
        expiryYear: '2026',
        cardType: 'mastercard',
        lastFourDigits: '2222',
        cardNumberEncrypted: 'encrypted2',
        isDefault: false
      });

      const defaultCards = await Card.find({ userId: testUserId, isDefault: true });
      expect(defaultCards.length).toBe(1);
      expect(defaultCards[0].lastFourDigits).toBe('1111');
    });
  });

  describe('Card Status', () => {
    test('should default to active status', async() => {
      const mockCreated = {
        id: 'card-123',
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted',
        status: 'active',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreated);

      const card = await Card.create({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted'
      });

      expect(card.status).toBe('active');
    });

    test('should allow deactivation', async() => {
      const mockCard = {
        id: 'card-123',
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted',
        status: 'active',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedMockCard = { ...mockCard, status: 'inactive', updatedAt: new Date() };

      db.create.mockResolvedValue(mockCard);
      db.update.mockResolvedValue(updatedMockCard);
      db.findById.mockResolvedValue(updatedMockCard);

      const card = await Card.create({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted'
      });

      const cardInstance = new Card(card);
      cardInstance.status = 'inactive';
      await cardInstance.save();

      const updatedCard = await Card.findById(card.id);
      expect(updatedCard.status).toBe('inactive');
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

      const mockCreated = {
        id: 'card-123',
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted',
        billingAddress: JSON.stringify(billingAddress),
        status: 'active',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      db.create.mockResolvedValue(mockCreated);

      const card = await Card.create({
        userId: testUserId,
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cardType: 'visa',
        lastFourDigits: '1111',
        cardNumberEncrypted: 'encrypted',
        billingAddress
      });

      const parsedAddress = JSON.parse(card.billingAddress);
      expect(parsedAddress.street).toBe(billingAddress.street);
      expect(parsedAddress.city).toBe(billingAddress.city);
      expect(parsedAddress.postalCode).toBe(billingAddress.postalCode);
    });
  });
});
