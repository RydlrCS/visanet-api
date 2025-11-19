#!/bin/bash

###############################################################################
# Rydlr Visanet API - Complete Deployment Script
# Server: locapay.rydlr.com (102.219.23.35)
# User: rydlr
# Created: November 15, 2025
###############################################################################

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
DOMAIN="locapay.rydlr.com"
APP_DIR="/home/rydlr/domains/${DOMAIN}"
APP_NAME="visanet-api"
NODE_VERSION="20"
PM2_APP_NAME="rydlr-visanet-api"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Rydlr Visanet API - Deployment${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Step 1: Check if running as rydlr user
if [ "$USER" != "rydlr" ]; then
    echo -e "${RED}This script should be run as user 'rydlr'${NC}"
    echo "Switch to rydlr user: sudo su - rydlr"
    exit 1
fi

# Step 2: Navigate to app directory
echo -e "${GREEN}[1/10] Navigating to application directory...${NC}"
cd ${APP_DIR} || exit 1

# Step 3: Install Node.js if not present
echo -e "${GREEN}[2/10] Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing via nvm...${NC}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install ${NODE_VERSION}
    nvm use ${NODE_VERSION}
    nvm alias default ${NODE_VERSION}
else
    echo -e "${GREEN}✓ Node.js $(node -v) already installed${NC}"
fi

# Step 4: Install PM2 globally
echo -e "${GREEN}[3/10] Installing PM2 process manager...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo -e "${GREEN}✓ PM2 already installed${NC}"
fi

# Step 5: Clone or pull repository
echo -e "${GREEN}[4/10] Setting up repository...${NC}"
if [ -d "${APP_NAME}" ]; then
    cd ${APP_NAME}
    git pull origin main
else
    git clone https://github.com/RydlrCS/visanet-api.git ${APP_NAME}
    cd ${APP_NAME}
fi

# Step 6: Install backend dependencies
echo -e "${GREEN}[5/10] Installing backend dependencies...${NC}"
npm install --production

# Step 7: Build frontend
echo -e "${GREEN}[6/10] Building frontend application...${NC}"
cd client
npm install
npm run build
cd ..

# Step 8: Copy production environment file
echo -e "${GREEN}[7/10] Setting up environment variables...${NC}"
if [ ! -f ".env" ]; then
    cp .env.production .env
    echo -e "${YELLOW}⚠ Please update .env file with your credentials${NC}"
    echo -e "${YELLOW}  Edit: nano ${APP_DIR}/${APP_NAME}/.env${NC}"
fi

# Step 9: Create necessary directories
echo -e "${GREEN}[8/10] Creating required directories...${NC}"
mkdir -p logs uploads backups ssl

# Step 10: Set permissions
echo -e "${GREEN}[9/10] Setting permissions...${NC}"
chmod 600 .env
chmod 755 deployment/*.sh

# Step 11: Start application with PM2
echo -e "${GREEN}[10/10] Starting application with PM2...${NC}"

# Create PM2 ecosystem file
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '${PM2_APP_NAME}',
    script: './server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Stop existing instance if running
pm2 stop ${PM2_APP_NAME} 2>/dev/null || true
pm2 delete ${PM2_APP_NAME} 2>/dev/null || true

# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup | tail -1 | sudo bash

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "Application Status:"
pm2 list

echo -e "\n${GREEN}Next Steps:${NC}"
echo -e "1. Configure your .env file: ${YELLOW}nano ${APP_DIR}/${APP_NAME}/.env${NC}"
echo -e "2. Run database setup: ${YELLOW}sudo bash deployment/setup-database.sh${NC}"
echo -e "3. Configure Apache/Nginx proxy (see deployment/apache-config.conf)"
echo -e "4. Setup SSL certificate"
echo -e "5. Restart application: ${YELLOW}pm2 restart ${PM2_APP_NAME}${NC}"

echo -e "\n${GREEN}Useful Commands:${NC}"
echo -e "  View logs: ${YELLOW}pm2 logs ${PM2_APP_NAME}${NC}"
echo -e "  Restart: ${YELLOW}pm2 restart ${PM2_APP_NAME}${NC}"
echo -e "  Stop: ${YELLOW}pm2 stop ${PM2_APP_NAME}${NC}"
echo -e "  Monitor: ${YELLOW}pm2 monit${NC}\n"
