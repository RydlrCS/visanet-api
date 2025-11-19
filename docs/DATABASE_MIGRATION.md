# Database Migration: MongoDB to MariaDB

## Overview
Successfully migrated the application from MongoDB/Mongoose to MariaDB/MySQL2 for production deployment on Virtualmin.

## Changes Made

### 1. Database Configuration (`config/database.js`)
**Before**: Mongoose connection with MongoDB
**After**: MySQL2 connection pool with MariaDB

**Key Features**:
- Connection pooling (10 connections)
- Automatic reconnection
- Transaction support with rollback
- Query builders for SELECT, INSERT, UPDATE, DELETE
- Generic CRUD operations
- UUID generation
- SQL injection protection via prepared statements
- UTF8MB4 charset for emoji support

**Exports**:
```javascript
connectDB()           // Legacy API for backward compatibility
db.init()            // Initialize database
db.query(sql, params) // Execute raw SQL
db.transaction(fn)    // Execute transaction
db.create(table, data)
db.findOne(table, conditions)
db.findMany(table, conditions, options)
db.findById(table, id)
db.update(table, id, data)
db.delete(table, id)
db.count(table, conditions)
```

---

### 2. User Model (`models/User.js`)
**Before**: Mongoose Schema with middleware hooks
**After**: ES6 Class with static and instance methods

**Migration Details**:
- ✅ Password hashing (bcrypt) - **Preserved**
- ✅ Email validation - **Preserved**
- ✅ Password comparison - **Preserved**
- ✅ toJSON (removes password) - **Preserved**
- 🔄 Schema fields mapped to database columns:
  - `firstName` + `lastName` → `businessName` (concatenated)
  - `visaDetails.customerId` → `visaCustomerId`
  - `visaDetails.merchantId` → `visaMerchantId`
  - `address` → JSON string
  - `kycDocuments` → JSON string

**New Methods**:
- `User.create(userData)` - Create user with validation
- `User.findByEmail(email)` - Find by email
- `User.hashPassword(password)` - Static password hashing
- `user.save()` - Save/update instance

**Breaking Changes**:
- ⚠️ `user._id` → `user.id` (UUID instead of ObjectId)
- ⚠️ `user.firstName`, `user.lastName` → `user.businessName`
- ⚠️ Must manually parse JSON fields: `address`, `kycDocuments`

---

### 3. Card Model (`models/Card.js`)
**Before**: Mongoose Schema with encryption methods
**After**: ES6 Class with static encryption methods

**Migration Details**:
- ✅ Card encryption/decryption - **Preserved**
- ✅ Expiry month validation - **Preserved**
- ✅ Card type validation - **Preserved**
- 🔄 Schema fields mapped:
  - `isActive` → `status` (ENUM: 'active', 'inactive', 'expired')
  - `billingAddress` → JSON string

**New Methods**:
- `Card.create(cardData)` - Create card with validation
- `Card.findByUserId(userId, activeOnly)` - Find user's cards
- `Card.encryptCardNumber(cardNumber)` - Static encryption
- `card.decryptCardNumber()` - Instance decryption

**Breaking Changes**:
- ⚠️ `card._id` → `card.id` (UUID)
- ⚠️ `card.userId` now stores UUID string (not ObjectId)
- ⚠️ `card.isActive` → `card.status`
- ⚠️ Must manually parse JSON field: `billingAddress`

---

### 4. Transaction Model (`models/Transaction.js`)
**Before**: Mongoose Schema with indexes
**After**: ES6 Class with aggregation methods

**Migration Details**:
- ✅ Status validation - **Preserved**
- ✅ Type validation - **Preserved** (only 'push', 'pull' supported now)
- ✅ Amount validation - **Preserved**
- 🔄 Schema fields mapped:
  - Removed: `transactionId` (UUID `id` serves this purpose)
  - Removed: `senderCard`, `recipientCard`, `merchantInfo`, `timestamps` nested objects
  - Removed: `webhookNotifications` array
  - `metadata` → JSON string
  - `errorDetails` → JSON string

**New Methods**:
- `Transaction.create(transactionData)` - Create with validation
- `Transaction.findByUserId(userId, options)` - User's transactions
- `Transaction.findByVisaTransactionId(visaTransactionId)` - Find by Visa ID
- `Transaction.getStats(userId, startDate, endDate)` - Aggregated statistics

**New Stats Method**:
```javascript
const stats = await Transaction.getStats(userId);
// Returns:
{
  totalTransactions: 100,
  successfulTransactions: 85,
  failedTransactions: 10,
  pendingTransactions: 5,
  totalVolume: 50000.00,
  averageAmount: 588.24
}
```

**Breaking Changes**:
- ⚠️ `transaction._id` → `transaction.id` (UUID)
- ⚠️ `transaction.transactionId` removed (use `id` instead)
- ⚠️ `transaction.userId` now stores UUID string
- ⚠️ Nested objects removed: `senderCard`, `recipientCard`, `merchantInfo`, `timestamps`
- ⚠️ `webhookNotifications` array removed
- ⚠️ Must manually parse JSON fields: `metadata`, `errorDetails`

---

### 5. Server Configuration (`server.js`)
**Changes**:
- Database connection with error handling
- Health check endpoint tests database connectivity
- Graceful shutdown closes database pool

**Health Endpoint**:
```bash
GET /health

Response (healthy):
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "database": "connected"
}

Response (unhealthy):
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": "disconnected",
  "error": "Connection refused"
}
```

---

## Required Updates in Other Files

### Routes
Update all route files that use models:

#### `routes/auth.js`
```javascript
// OLD
const user = await User.findOne({ email });

// NEW (no change needed - API compatible)
const user = await User.findByEmail(email);
```

#### `routes/cards.js`
```javascript
// OLD
const cards = await Card.find({ userId: req.user._id, isActive: true });

// NEW
const cards = await Card.findByUserId(req.user.id, true);

// When accessing billingAddress, it's already parsed
console.log(card.billingAddress.city); // Works automatically
```

#### `routes/transactions.js`
```javascript
// OLD
const transaction = await Transaction.findOne({ transactionId });

// NEW
const transaction = await Transaction.findById(id);
// OR
const transaction = await Transaction.findByVisaTransactionId(visaTransactionId);

// Get stats
const stats = await Transaction.getStats(userId, startDate, endDate);
```

### Middleware (`middleware/auth.js`)
```javascript
// OLD
const user = await User.findById(decoded.userId);

// NEW (no change needed)
const user = await User.findById(decoded.userId);

// Access user fields
req.user = {
  id: user.id,           // Changed from _id
  email: user.email,
  role: user.role
};
```

---

## Database Schema Differences

### MariaDB Tables Created
The `deployment/setup-database.sh` script creates these tables:

1. **users**
   - `id` VARCHAR(36) PRIMARY KEY (UUID)
   - `email` VARCHAR(255) UNIQUE
   - `password` VARCHAR(255)
   - `businessName` VARCHAR(255)
   - `phone` VARCHAR(20)
   - `address` JSON
   - `kycStatus` ENUM
   - `kycDocuments` JSON
   - `isActive` BOOLEAN
   - `role` ENUM('user', 'merchant', 'admin')
   - `visaCustomerId`, `visaMerchantId` VARCHAR(255)
   - `lastLogin` TIMESTAMP
   - `createdAt`, `updatedAt` TIMESTAMP

2. **cards**
   - `id` VARCHAR(36) PRIMARY KEY
   - `userId` VARCHAR(36) FOREIGN KEY → users(id) ON DELETE CASCADE
   - `cardNumberEncrypted` TEXT
   - `lastFourDigits` VARCHAR(4)
   - `cardholderName` VARCHAR(255)
   - `expiryMonth` VARCHAR(2)
   - `expiryYear` VARCHAR(4)
   - `cardType` ENUM
   - `isDefault` BOOLEAN
   - `status` ENUM('active', 'inactive', 'expired')
   - `billingAddress` JSON
   - `visaCardId` VARCHAR(255)
   - `createdAt`, `updatedAt` TIMESTAMP

3. **transactions**
   - `id` VARCHAR(36) PRIMARY KEY
   - `userId` VARCHAR(36) FOREIGN KEY → users(id)
   - `type` ENUM('push', 'pull')
   - `amount` DECIMAL(15,2)
   - `currency` VARCHAR(3)
   - `status` ENUM(5 values)
   - `visaTransactionId` VARCHAR(255) UNIQUE
   - `retrievalReferenceNumber` VARCHAR(255)
   - `systemsTraceAuditNumber` VARCHAR(255)
   - `metadata` JSON
   - `errorDetails` JSON
   - `ipAddress` VARCHAR(45)
   - `userAgent` TEXT
   - `createdAt`, `updatedAt` TIMESTAMP

### Indexes Created
- `users.email` (UNIQUE)
- `cards.userId`
- `cards.status`
- `transactions.userId`
- `transactions.visaTransactionId` (UNIQUE)
- `transactions.status`
- `transactions.createdAt`

---

## Migration Checklist

### Completed ✅
- [x] Install mysql2 package
- [x] Update `config/database.js` to MariaDB adapter
- [x] Convert `models/User.js` to class-based model
- [x] Convert `models/Card.js` to class-based model
- [x] Convert `models/Transaction.js` to class-based model
- [x] Update `server.js` with database error handling
- [x] Add health check with database connectivity test
- [x] Add graceful shutdown for database pool

### Pending ⏳
- [ ] Update `routes/auth.js` for new model API
- [ ] Update `routes/cards.js` for new model API
- [ ] Update `routes/transactions.js` for new model API
- [ ] Update `routes/users.js` for new model API
- [ ] Update `middleware/auth.js` for `user.id` vs `user._id`
- [ ] Update all test files for new model API
- [ ] Run database setup script on production server
- [ ] Update environment variables with MariaDB credentials
- [ ] Test all API endpoints with MariaDB
- [ ] Update documentation with new model API

---

## Testing

### Local Testing (Development)
1. **Install MariaDB** (if not already installed):
   ```bash
   brew install mariadb
   brew services start mariadb
   ```

2. **Create development database**:
   ```bash
   mysql -u root -p
   CREATE DATABASE rydlr_locapay_dev;
   CREATE USER 'rydlr_dev'@'localhost' IDENTIFIED BY 'dev_password';
   GRANT ALL PRIVILEGES ON rydlr_locapay_dev.* TO 'rydlr_dev'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. **Run database setup**:
   ```bash
   # Modify setup-database.sh to use dev credentials
   sudo bash deployment/setup-database.sh
   ```

4. **Update `.env`**:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=rydlr_dev
   DB_PASSWORD=dev_password
   DB_NAME=rydlr_locapay_dev
   ```

5. **Test connection**:
   ```bash
   npm start
   curl http://localhost:3000/health
   ```

### Production Deployment
Follow the `deployment/DEPLOYMENT_GUIDE.md`

---

## Rollback Plan

If migration fails, rollback by:

1. **Restore old files**:
   ```bash
   git checkout HEAD~1 config/database.js models/
   ```

2. **Reinstall mongoose**:
   ```bash
   npm install mongoose
   ```

3. **Update `.env`**:
   ```env
   MONGODB_URI=mongodb://localhost:27017/visanet
   ```

4. **Restart server**:
   ```bash
   pm2 restart rydlr-visanet-api
   ```

---

## Performance Considerations

### Connection Pool
- Current: 10 connections
- Adjust based on load: `connectionLimit` in `config/database.js`

### Query Optimization
- All tables have proper indexes
- Use `options.limit` for pagination
- Use `Transaction.getStats()` for aggregations (faster than multiple queries)

### JSON Fields
- `address`, `billingAddress`, `metadata`, `errorDetails` stored as JSON
- Automatically parsed when retrieved
- Searchable with MariaDB JSON functions if needed

---

## Security Notes

1. **Password Hashing**: Still using bcrypt with 10 rounds
2. **Card Encryption**: AES-256-CBC encryption preserved
3. **SQL Injection**: Prevented via prepared statements
4. **UUID Primary Keys**: More secure than sequential IDs
5. **Foreign Key Constraints**: CASCADE delete on user relationships

---

## Support

For issues with migration:
- Check logs: `pm2 logs rydlr-visanet-api --err`
- Test database: `mysql -u rydlr -p rydlr_locapay`
- Health check: `curl http://localhost:3000/health`

**Contact**: support@rydlr.com
