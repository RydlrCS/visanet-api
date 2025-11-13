# VisaNet API Integration

A secure Node.js/Express API for Visa Direct payment integration with full compliance to Visa standards.

## Features

- ✅ **Visa Direct API Integration**: Push payments, pull funds, and transaction reversals
- ✅ **Secure Authentication**: JWT-based user authentication with bcrypt password hashing
- ✅ **PCI Compliance**: AES-256-CBC encryption for sensitive card data
- ✅ **Webhook Support**: Real-time transaction notifications at `https://www.locapay.rydlr.com/visanet/webhook`
- ✅ **KYC Management**: User verification and compliance workflows
- ✅ **Transaction Tracking**: Complete audit trail with MongoDB
- ✅ **Rate Limiting**: DDoS protection with 100 requests per 15 minutes
- ✅ **Security Headers**: Helmet.js security best practices

## Prerequisites

- Node.js 16+ and npm
- MongoDB 5.0+
- Visa Developer Platform account
- Valid Visa API certificates (client cert, key, CA cert)

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/RydlrCS/visanet-api.git
cd visanet-api
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

4. **Add Visa certificates**
Place your Visa API certificates in the `certs/` directory:
- `certs/cert.pem` - Client certificate
- `certs/key.pem` - Private key
- `certs/ca.pem` - CA certificate

5. **Start MongoDB**
```bash
# Make sure MongoDB is running
mongod
```

6. **Run the application**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Transactions
- `POST /api/transactions/push` - Send money (Push Payment)
- `POST /api/transactions/pull` - Request money (Pull Funds)
- `GET /api/transactions` - Get user transactions
- `GET /api/transactions/:id` - Get transaction details

### Cards
- `POST /api/cards` - Add new card
- `GET /api/cards` - Get all user cards
- `GET /api/cards/:id` - Get card details
- `PUT /api/cards/:id/set-default` - Set default card
- `DELETE /api/cards/:id` - Delete card

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/kyc` - Submit KYC information
- `GET /api/users/kyc-status` - Get KYC status

### Webhooks
- `POST /visanet/webhook` - Visa transaction notifications

### Health Check
- `GET /health` - API health status

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/visanet

# JWT
JWT_SECRET=your-secret-key-here

# Encryption
ENCRYPTION_KEY=32-byte-hex-key-for-aes-256

# Visa API
VISA_API_URL=https://sandbox.api.visa.com
VISA_USER_ID=your-visa-user-id
VISA_PASSWORD=your-visa-password
VISA_CERT_PATH=./certs/cert.pem
VISA_KEY_PATH=./certs/key.pem
VISA_CA_PATH=./certs/ca.pem
VISA_ACQUIRING_BIN=408999
VISA_MERCHANT_ID=LOCAPAY001

# Webhook
WEBHOOK_URL=https://www.locapay.rydlr.com/visanet/webhook
WEBHOOK_SECRET=your-webhook-secret
```

## Usage Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890"
  }'
```

### Push Payment
```bash
curl -X POST http://localhost:3000/api/transactions/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 100.00,
    "currency": "USD",
    "recipientCard": {
      "number": "4111111111111111",
      "name": "Jane Smith"
    },
    "description": "Payment for services"
  }'
```

## Security

- All card numbers are encrypted using AES-256-CBC
- Passwords are hashed using bcryptjs
- JWT tokens expire after 7 days
- HTTPS agent with mutual TLS for Visa API
- Helmet.js security headers
- CORS protection
- Rate limiting on all endpoints

## Project Structure

```
visanet-api/
├── config/
│   ├── database.js          # MongoDB connection
│   └── visa.js              # Visa API configuration
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── User.js              # User schema
│   ├── Transaction.js       # Transaction schema
│   └── Card.js              # Card schema with encryption
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── transactions.js      # Transaction routes
│   ├── cards.js             # Card management routes
│   ├── users.js             # User profile routes
│   └── webhooks.js          # Webhook handler
├── services/
│   └── visaDirect.js        # Visa Direct API service
├── utils/
│   └── logger.js            # Winston logger
├── certs/                   # Visa API certificates (gitignored)
├── logs/                    # Application logs (gitignored)
├── .env                     # Environment variables (gitignored)
├── .env.example             # Environment template
├── server.js                # Express application
└── package.json             # Dependencies
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Compliance

This API follows:
- **PCI-DSS**: Card data encryption and secure storage
- **Visa Standards**: Compliance with Visa Direct API requirements
- **GDPR**: User data protection and privacy
- **SOC 2**: Security and audit logging

## Webhook Configuration

Configure your webhook URL in the Visa Developer Dashboard:
```
https://www.locapay.rydlr.com/visanet/webhook
```

The webhook endpoint verifies signatures using HMAC-SHA256 and processes:
- `TRANSACTION_COMPLETED` - Payment successful
- `TRANSACTION_FAILED` - Payment failed
- `TRANSACTION_REVERSED` - Payment reversed

## Troubleshooting

### Certificate Errors
```bash
# Verify certificate paths in .env
# Ensure certificates are in PEM format
openssl x509 -in certs/cert.pem -text -noout
```

### MongoDB Connection Issues
```bash
# Check MongoDB status
systemctl status mongod

# Test connection
mongo --eval "db.adminCommand('ping')"
```

### Visa API Errors
Check logs at `logs/error.log` for detailed error messages.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues or questions:
- GitHub Issues: https://github.com/RydlrCS/visanet-api/issues
- Email: support@locapay.rydlr.com

## Acknowledgments

- Visa Developer Platform for API documentation
- LocaPay Rydlr team for requirements and specifications
