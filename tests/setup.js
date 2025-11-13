/**
 * Jest Test Setup
 * Runs before all tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.WEBHOOK_SECRET = 'test-webhook-secret';

// Visa API test credentials
process.env.VISA_API_URL = 'https://sandbox.api.visa.com';
process.env.VISA_USER_ID = 'test-user-id';
process.env.VISA_PASSWORD = 'test-password';
process.env.VISA_CERT_PATH = './tests/fixtures/mock-cert.pem';
process.env.VISA_KEY_PATH = './tests/fixtures/mock-key.pem';
process.env.VISA_CA_PATH = './tests/fixtures/mock-ca.pem';

// Setup MongoDB Memory Server
beforeAll(async() => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
}, 30000);

// Cleanup MongoDB Memory Server
afterAll(async() => {
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

// Global test timeout
jest.setTimeout(15000);
