# VisaNet API Deployment Guide

This guide walks you through deploying the VisaNet API to a production environment.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Virtual Machine Setup](#virtual-machine-setup)
3. [Visa Developer Platform Configuration](#visa-developer-platform-configuration)
4. [SSL/TLS Certificate Setup](#ssltls-certificate-setup)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Application Deployment](#application-deployment)
8. [Webhook Configuration](#webhook-configuration)
9. [Monitoring & Logging](#monitoring--logging)
10. [Security Hardening](#security-hardening)

---

## Prerequisites

- Virtual machine with Ubuntu 20.04+ or similar
- Domain name: `locapay.rydlr.com`
- Visa Developer Platform account with approved application
- MongoDB 5.0+
- Node.js 16+
- SSL certificates for HTTPS

---

## Virtual Machine Setup

### 1. Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x
```

### 2. Install MongoDB

```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### 3. Configure Firewall

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow MongoDB (only from localhost)
sudo ufw allow from 127.0.0.1 to any port 27017

# Enable firewall
sudo ufw enable
```

---

## Visa Developer Platform Configuration

### 1. Create Application on Visa Developer Platform

1. Go to https://developer.visa.com
2. Navigate to "Dashboard" → "Create App"
3. Configure your application:
   - **App Name**: LocaPay Rydlr VisaNet
   - **APIs**: Add Visa Direct API
   - **Environment**: Start with Sandbox, then move to Production

### 2. Download Certificates

1. In your Visa app dashboard, go to "Credentials"
2. Download the following files:
   - Client Certificate (cert.pem)
   - Private Key (key.pem)
   - Visa CA Certificate (ca.pem)
3. Keep these files secure!

### 3. Configure Webhook URL

1. In your app settings, add webhook URL:
   ```
   https://www.locapay.rydlr.com/visanet/webhook
   ```
2. Select events to receive:
   - Transaction Completed
   - Transaction Failed
   - Transaction Reversed

---

## SSL/TLS Certificate Setup

### Option 1: Let's Encrypt (Recommended for Production)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --nginx -d locapay.rydlr.com -d www.locapay.rydlr.com

# Certificates will be stored at:
# /etc/letsencrypt/live/locapay.rydlr.com/fullchain.pem
# /etc/letsencrypt/live/locapay.rydlr.com/privkey.pem
```

### Option 2: Custom SSL Certificate

If you have a custom certificate:

```bash
# Create directory for SSL certs
sudo mkdir -p /etc/ssl/locapay

# Copy your certificates
sudo cp your-certificate.crt /etc/ssl/locapay/
sudo cp your-private-key.key /etc/ssl/locapay/

# Set permissions
sudo chmod 600 /etc/ssl/locapay/*
```

---

## Environment Configuration

### 1. Create Application User

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash visanet
sudo usermod -aG sudo visanet

# Switch to visanet user
sudo su - visanet
```

### 2. Clone Repository

```bash
# Clone the repository
git clone https://github.com/RydlrCS/visanet-api.git
cd visanet-api

# Install dependencies
npm install --production
```

### 3. Configure Environment Variables

```bash
# Copy and edit .env file
cp .env.example .env
nano .env
```

Update with production values:

```env
# Server
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/visanet_prod

# JWT (Generate strong secret)
JWT_SECRET=<generate-with-openssl-rand-base64-64>

# Encryption (Generate 32-byte key)
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>

# Visa API - PRODUCTION
VISA_API_URL=https://api.visa.com
VISA_USER_ID=<your-visa-user-id>
VISA_PASSWORD=<your-visa-password>
VISA_CERT_PATH=/home/visanet/visanet-api/certs/cert.pem
VISA_KEY_PATH=/home/visanet/visanet-api/certs/key.pem
VISA_CA_PATH=/home/visanet/visanet-api/certs/ca.pem
VISA_ACQUIRING_BIN=<your-bin>
VISA_MERCHANT_ID=LOCAPAY001

# Webhook
WEBHOOK_URL=https://www.locapay.rydlr.com/visanet/webhook
WEBHOOK_SECRET=<generate-with-openssl-rand-hex-32>
```

### 4. Add Visa Certificates

```bash
# Copy certificates to certs directory
cp /path/to/cert.pem ~/visanet-api/certs/
cp /path/to/key.pem ~/visanet-api/certs/
cp /path/to/ca.pem ~/visanet-api/certs/

# Set permissions (important!)
chmod 600 ~/visanet-api/certs/*
```

---

## Database Setup

### 1. Secure MongoDB

```bash
# Create admin user
mongosh
```

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "STRONG_PASSWORD_HERE",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

// Create database user for VisaNet
use visanet_prod
db.createUser({
  user: "visanet_user",
  pwd: "STRONG_PASSWORD_HERE",
  roles: [ { role: "readWrite", db: "visanet_prod" } ]
})
```

### 2. Enable MongoDB Authentication

```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf
```

Add:
```yaml
security:
  authorization: enabled
```

Restart MongoDB:
```bash
sudo systemctl restart mongod
```

### 3. Update Connection String

Update `.env`:
```env
MONGODB_URI=mongodb://visanet_user:STRONG_PASSWORD_HERE@localhost:27017/visanet_prod
```

---

## Application Deployment

### 1. Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application with PM2
pm2 start server.js --name visanet-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command it outputs
```

### 2. Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/visanet-api
```

Add:
```nginx
upstream visanet_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name locapay.rydlr.com www.locapay.rydlr.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name locapay.rydlr.com www.locapay.rydlr.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/locapay.rydlr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/locapay.rydlr.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy Configuration
    location / {
        proxy_pass http://visanet_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook endpoint (no auth required)
    location /visanet/webhook {
        proxy_pass http://visanet_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/visanet-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Webhook Configuration

### 1. Test Webhook Locally

```bash
# Use ngrok for local testing (development only)
npm install -g ngrok
ngrok http 3000

# Use the ngrok URL to test webhooks in Visa Developer Dashboard
```

### 2. Verify Webhook in Production

```bash
# Test webhook endpoint
curl -X POST https://www.locapay.rydlr.com/visanet/webhook \
  -H "Content-Type: application/json" \
  -H "x-visa-signature: test" \
  -d '{
    "transactionId": "test123",
    "status": "completed",
    "eventType": "TRANSACTION_COMPLETED"
  }'
```

---

## Monitoring & Logging

### 1. View Application Logs

```bash
# PM2 logs
pm2 logs visanet-api

# Application logs
tail -f ~/visanet-api/logs/all.log
tail -f ~/visanet-api/logs/error.log
```

### 2. Monitor Application Status

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
```

### 3. Setup Log Rotation

```bash
# Install logrotate
sudo apt install -y logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/visanet-api
```

Add:
```
/home/visanet/visanet-api/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 visanet visanet
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Security Hardening

### 1. Disable Root Login

```bash
sudo nano /etc/ssh/sshd_config
```

Set:
```
PermitRootLogin no
PasswordAuthentication no
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 2. Install Fail2Ban

```bash
sudo apt install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Add:
```
[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 3600
```

Start Fail2Ban:
```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Regular Security Updates

```bash
# Enable automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Deployment Checklist

- [ ] Virtual machine configured with Ubuntu 20.04+
- [ ] Node.js 20+ installed
- [ ] MongoDB 6+ installed and secured
- [ ] Visa certificates downloaded and placed in `/certs`
- [ ] `.env` file configured with production values
- [ ] SSL certificates installed (Let's Encrypt or custom)
- [ ] Nginx configured as reverse proxy
- [ ] Application running with PM2
- [ ] PM2 configured to start on boot
- [ ] Webhook URL configured in Visa Developer Dashboard
- [ ] Firewall configured (UFW)
- [ ] MongoDB authentication enabled
- [ ] Log rotation configured
- [ ] Monitoring setup (PM2, logs)
- [ ] Security hardening complete (SSH, Fail2Ban)
- [ ] Health check endpoint responding: `curl https://www.locapay.rydlr.com/health`

---

## Useful Commands

```bash
# Application Management
pm2 restart visanet-api
pm2 stop visanet-api
pm2 start visanet-api
pm2 delete visanet-api

# View Logs
pm2 logs visanet-api
pm2 logs visanet-api --lines 100

# MongoDB Management
sudo systemctl status mongod
sudo systemctl restart mongod
mongosh --authenticationDatabase admin -u admin -p

# Nginx Management
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx

# Check Application Status
curl https://www.locapay.rydlr.com/health
pm2 status
```

---

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh mongodb://localhost:27017
```

### Certificate Errors
```bash
# Verify certificate files exist
ls -la ~/visanet-api/certs/

# Test certificate
openssl x509 -in ~/visanet-api/certs/cert.pem -text -noout
```

### Webhook Not Receiving Events
```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Test webhook endpoint
curl -X POST https://www.locapay.rydlr.com/visanet/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Support

For deployment issues:
- Email: support@locapay.rydlr.com
- GitHub Issues: https://github.com/RydlrCS/visanet-api/issues
