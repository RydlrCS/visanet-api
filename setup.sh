#!/bin/bash

echo "======================================"
echo "VisaNet API Setup Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}✗ Node.js version 16 or higher is required${NC}"
    echo "  Current version: $(node -v)"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version OK: $(node -v)${NC}"
echo ""

# Check if MongoDB is running
echo "Checking MongoDB connection..."
if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
elif mongo --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${YELLOW}⚠ MongoDB doesn't appear to be running${NC}"
    echo "  Please start MongoDB before running the application"
fi
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "  Creating from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT: You must edit .env with your actual credentials!${NC}"
    echo ""
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi
echo ""

# Check certificates directory
echo "Checking Visa API certificates..."
if [ ! -d "certs" ]; then
    mkdir -p certs
    echo -e "${GREEN}✓ Created certs/ directory${NC}"
fi

CERT_MISSING=0
if [ ! -f "certs/cert.pem" ]; then
    echo -e "${YELLOW}⚠ Missing: certs/cert.pem${NC}"
    CERT_MISSING=1
fi
if [ ! -f "certs/key.pem" ]; then
    echo -e "${YELLOW}⚠ Missing: certs/key.pem${NC}"
    CERT_MISSING=1
fi
if [ ! -f "certs/ca.pem" ]; then
    echo -e "${YELLOW}⚠ Missing: certs/ca.pem${NC}"
    CERT_MISSING=1
fi

if [ $CERT_MISSING -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}Please add your Visa API certificates to the certs/ directory:${NC}"
    echo "  1. Download certificates from Visa Developer Platform"
    echo "  2. Place them in certs/ directory:"
    echo "     - certs/cert.pem (Client certificate)"
    echo "     - certs/key.pem (Private key)"
    echo "     - certs/ca.pem (CA certificate)"
    echo ""
else
    echo -e "${GREEN}✓ All certificate files found${NC}"
fi
echo ""

# Generate encryption key if needed
echo "Checking encryption key..."
if grep -q "your-32-byte-hex-encryption-key-here" .env; then
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-32-byte-hex-encryption-key-here/$ENCRYPTION_KEY/" .env
    else
        sed -i "s/your-32-byte-hex-encryption-key-here/$ENCRYPTION_KEY/" .env
    fi
    echo -e "${GREEN}✓ Generated new encryption key${NC}"
else
    echo -e "${GREEN}✓ Encryption key already set${NC}"
fi
echo ""

# Generate JWT secret if needed
echo "Checking JWT secret..."
if grep -q "your-super-secret-jwt-key-change-this-in-production" .env; then
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
    else
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
    fi
    echo -e "${GREEN}✓ Generated new JWT secret${NC}"
else
    echo -e "${GREEN}✓ JWT secret already set${NC}"
fi
echo ""

# Generate webhook secret if needed
echo "Checking webhook secret..."
if grep -q "your-webhook-secret-key" .env; then
    WEBHOOK_SECRET=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-webhook-secret-key/$WEBHOOK_SECRET/" .env
    else
        sed -i "s/your-webhook-secret-key/$WEBHOOK_SECRET/" .env
    fi
    echo -e "${GREEN}✓ Generated new webhook secret${NC}"
else
    echo -e "${GREEN}✓ Webhook secret already set${NC}"
fi
echo ""

# Create logs directory
if [ ! -d "logs" ]; then
    mkdir -p logs
    echo -e "${GREEN}✓ Created logs/ directory${NC}"
else
    echo -e "${GREEN}✓ logs/ directory exists${NC}"
fi
echo ""

echo "======================================"
echo "Setup Summary"
echo "======================================"
echo ""
echo "Next Steps:"
echo ""
echo "1. Edit .env file with your Visa API credentials:"
echo "   - VISA_USER_ID"
echo "   - VISA_PASSWORD"
echo "   - VISA_ACQUIRING_BIN"
echo "   - VISA_MERCHANT_ID"
echo ""
echo "2. Add Visa certificates to certs/ directory"
echo ""
echo "3. Start MongoDB if not running:"
echo "   mongod"
echo ""
echo "4. Start the application:"
echo "   npm run dev    # Development mode"
echo "   npm start      # Production mode"
echo ""
echo "5. Test health endpoint:"
echo "   curl http://localhost:3000/health"
echo ""
echo "======================================"
