#!/bin/bash

###############################################################################
# Rydlr Visanet API - Database Setup Script for MariaDB
# Server: locapay.rydlr.com (102.219.23.35)
# Created: November 15, 2025
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="rydlr_locapay"
DB_USER="rydlr"
DB_HOST="localhost"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Rydlr Visanet API - Database Setup${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script should be run with sudo privileges${NC}"
   echo "Usage: sudo bash setup-database.sh"
   exit 1
fi

# Prompt for database password
echo -e "${YELLOW}Enter a secure password for database user '$DB_USER':${NC}"
read -s DB_PASSWORD
echo ""
echo -e "${YELLOW}Confirm password:${NC}"
read -s DB_PASSWORD_CONFIRM
echo ""

if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
    echo -e "${RED}Passwords do not match!${NC}"
    exit 1
fi

echo -e "\n${GREEN}Creating database and user...${NC}"

# Create database and user
mysql -u root <<MYSQL_SCRIPT
-- Create database
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user if not exists
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;

-- Show databases
SHOW DATABASES;
MYSQL_SCRIPT

echo -e "${GREEN}✓ Database '${DB_NAME}' created${NC}"
echo -e "${GREEN}✓ User '${DB_USER}' created with permissions${NC}"

# Create tables
echo -e "\n${GREEN}Creating database tables...${NC}"

mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} <<SQL_SCRIPT
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    businessName VARCHAR(255),
    contactPerson VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    isVerified BOOLEAN DEFAULT FALSE,
    isActive BOOLEAN DEFAULT TRUE,
    role ENUM('user', 'admin') DEFAULT 'user',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    userId VARCHAR(36) NOT NULL,
    cardNumberEncrypted TEXT NOT NULL,
    cardType ENUM('visa', 'mastercard', 'amex', 'discover') NOT NULL,
    expiryMonth INT NOT NULL,
    expiryYear INT NOT NULL,
    cardholderName VARCHAR(255) NOT NULL,
    isDefault BOOLEAN DEFAULT FALSE,
    billingAddress TEXT,
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    userId VARCHAR(36) NOT NULL,
    type ENUM('push', 'pull') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    cardId VARCHAR(36),
    recipientPAN VARCHAR(255),
    senderPAN VARCHAR(255),
    recipientName VARCHAR(255),
    senderName VARCHAR(255),
    description TEXT,
    visaTransactionId VARCHAR(255),
    visaApprovalCode VARCHAR(50),
    visaResponseCode VARCHAR(10),
    errorMessage TEXT,
    metadata JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE SET NULL,
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    userId VARCHAR(36) NOT NULL,
    type ENUM('transaction', 'system', 'security') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    isRead BOOLEAN DEFAULT FALSE,
    metadata JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_isRead (isRead),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    userId VARCHAR(36) NOT NULL,
    invoiceNumber VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('paid', 'pending', 'overdue', 'cancelled') DEFAULT 'pending',
    dueDate DATE NOT NULL,
    paidDate DATE,
    description TEXT,
    items JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_invoiceNumber (invoiceNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    userId VARCHAR(36) NOT NULL,
    keyName VARCHAR(255) NOT NULL,
    apiKey VARCHAR(255) UNIQUE NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    lastUsed TIMESTAMP NULL,
    expiresAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_apiKey (apiKey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    userId VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resourceId VARCHAR(36),
    ipAddress VARCHAR(45),
    userAgent TEXT,
    metadata JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_userId (userId),
    INDEX idx_action (action),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SQL_SCRIPT

echo -e "${GREEN}✓ Database tables created successfully${NC}"

# Create test user
echo -e "\n${GREEN}Creating test user...${NC}"

# Hash password for test user (using bcrypt equivalent)
# Note: In production, this should be done by the application
TEST_PASSWORD_HASH='$2b$10$YourHashedPasswordHere'  # Replace with actual hash

mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} <<SQL_SCRIPT
INSERT IGNORE INTO users (id, email, password, businessName, contactPerson, isVerified, isActive, role)
VALUES (
    UUID(),
    'test@rydlr.com',
    '${TEST_PASSWORD_HASH}',
    'Test Business',
    'Test User',
    TRUE,
    TRUE,
    'user'
);

INSERT IGNORE INTO users (id, email, password, businessName, contactPerson, isVerified, isActive, role)
VALUES (
    UUID(),
    'admin@rydlr.com',
    '${TEST_PASSWORD_HASH}',
    'Rydlr Admin',
    'Administrator',
    TRUE,
    TRUE,
    'admin'
);
SQL_SCRIPT

echo -e "${GREEN}✓ Test users created${NC}"

# Display summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Database Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nDatabase Information:"
echo -e "  Database Name: ${GREEN}${DB_NAME}${NC}"
echo -e "  Database User: ${GREEN}${DB_USER}${NC}"
echo -e "  Database Host: ${GREEN}${DB_HOST}${NC}"
echo -e "\nTest Accounts Created:"
echo -e "  User: ${GREEN}test@rydlr.com${NC}"
echo -e "  Admin: ${GREEN}admin@rydlr.com${NC}"
echo -e "\n${YELLOW}IMPORTANT:${NC}"
echo -e "1. Update your .env.production file with the database password"
echo -e "2. Secure this file: ${GREEN}chmod 600 /home/rydlr/domains/locapay.rydlr.com/.env.production${NC}"
echo -e "3. Test database connection before deploying"
echo -e "4. Change test user passwords immediately\n"

# Save connection details to a file
cat > /home/rydlr/domains/locapay.rydlr.com/database-credentials.txt <<EOF
Database Connection Details
===========================
Database: ${DB_NAME}
User: ${DB_USER}
Password: ${DB_PASSWORD}
Host: ${DB_HOST}
Port: 3306

Connection String:
mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:3306/${DB_NAME}

Created: $(date)
EOF

chmod 600 /home/rydlr/domains/locapay.rydlr.com/database-credentials.txt
echo -e "${GREEN}✓ Credentials saved to: /home/rydlr/domains/locapay.rydlr.com/database-credentials.txt${NC}\n"
