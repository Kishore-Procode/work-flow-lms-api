#!/bin/bash

# Student - ACT API - Deployment Setup Script
# This script sets up the necessary directories and permissions for production deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
APP_DIR="/var/www/osot"
UPLOAD_DIR="/var/www/osot/uploads"
USER="www-data"
GROUP="www-data"
NODE_ENV="production"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --app-dir)
            APP_DIR="$2"
            shift 2
            ;;
        --upload-dir)
            UPLOAD_DIR="$2"
            shift 2
            ;;
        --user)
            USER="$2"
            shift 2
            ;;
        --group)
            GROUP="$2"
            shift 2
            ;;
        --env)
            NODE_ENV="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --app-dir DIR     Application directory (default: /var/www/osot)"
            echo "  --upload-dir DIR  Upload directory (default: /var/www/osot/uploads)"
            echo "  --user USER       User to own files (default: www-data)"
            echo "  --group GROUP     Group to own files (default: www-data)"
            echo "  --env ENV         Environment (default: production)"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Use defaults"
            echo "  $0 --app-dir /opt/osot               # Custom app directory"
            echo "  $0 --upload-dir /data/osot/uploads   # Custom upload directory"
            echo "  $0 --user osot --group osot          # Custom user/group"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_status "Starting Student - ACT API deployment setup..."
print_status "App Directory: $APP_DIR"
print_status "Upload Directory: $UPLOAD_DIR"
print_status "User: $USER"
print_status "Group: $GROUP"
print_status "Environment: $NODE_ENV"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root or with sudo"
    exit 1
fi

# Create application directory
print_status "Creating application directory..."
mkdir -p "$APP_DIR"
print_success "Application directory created: $APP_DIR"

# Create upload directory structure
print_status "Creating upload directory structure..."
mkdir -p "$UPLOAD_DIR"
mkdir -p "$UPLOAD_DIR/tree-images"
mkdir -p "$UPLOAD_DIR/temp"
mkdir -p "$UPLOAD_DIR/backups"
print_success "Upload directories created"

# Set ownership
print_status "Setting directory ownership..."
if id "$USER" &>/dev/null; then
    chown -R "$USER:$GROUP" "$APP_DIR"
    chown -R "$USER:$GROUP" "$UPLOAD_DIR"
    print_success "Ownership set to $USER:$GROUP"
else
    print_warning "User $USER does not exist. Please create the user or use an existing one."
    print_warning "Skipping ownership change..."
fi

# Set permissions
print_status "Setting directory permissions..."
# App directory - read/execute for all, write for owner
chmod -R 755 "$APP_DIR"
# Upload directory - read/write/execute for owner and group, read/execute for others
chmod -R 775 "$UPLOAD_DIR"
# Ensure upload subdirectories have correct permissions
chmod 775 "$UPLOAD_DIR/tree-images"
chmod 775 "$UPLOAD_DIR/temp"
chmod 775 "$UPLOAD_DIR/backups"
print_success "Permissions set"

# Create .env file template if it doesn't exist
ENV_FILE="$APP_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    print_status "Creating .env file template..."
    cat > "$ENV_FILE" << EOF
# Server Configuration
NODE_ENV=$NODE_ENV
PORT=3000
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=osot
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false
DB_MAX_CONNECTIONS=100

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_change_this_in_production
JWT_REFRESH_EXPIRES_IN=30d

# File Upload Configuration
UPLOAD_PATH=$UPLOAD_DIR
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf
STATIC_FILES_BASE_URL=/uploads

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@domain.com
SMTP_PASSWORD=your_email_password
FROM_EMAIL=your_email@domain.com
FROM_NAME=Student - ACT

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL Configuration
FRONTEND_URL=https://yourdomain.com
FRONTEND_URLS=https://yourdomain.com

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/app.log

# API Documentation
SWAGGER_ENABLED=false

# Invitation Configuration
INVITATION_EXPIRES_DAYS=7
REGISTRATION_REQUEST_EXPIRES_DAYS=30

# Tree Monitoring Configuration
MONITORING_REMINDER_DAYS=180
PHOTO_REQUIRED_MONITORING=true
EOF
    chown "$USER:$GROUP" "$ENV_FILE"
    chmod 600 "$ENV_FILE"  # Secure permissions for .env file
    print_success ".env file template created: $ENV_FILE"
    print_warning "Please update the .env file with your actual configuration values!"
else
    print_status ".env file already exists, skipping creation"
fi

# Create logs directory
LOGS_DIR="$APP_DIR/logs"
print_status "Creating logs directory..."
mkdir -p "$LOGS_DIR"
chown "$USER:$GROUP" "$LOGS_DIR"
chmod 755 "$LOGS_DIR"
print_success "Logs directory created: $LOGS_DIR"

# Create systemd service file template
SERVICE_FILE="/etc/systemd/system/osot-api.service"
if [[ ! -f "$SERVICE_FILE" ]]; then
    print_status "Creating systemd service file..."
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Student - ACT API Server
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
Group=$GROUP
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=$NODE_ENV
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=osot-api

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR $UPLOAD_DIR /tmp

[Install]
WantedBy=multi-user.target
EOF
    print_success "Systemd service file created: $SERVICE_FILE"
    print_status "To enable and start the service:"
    print_status "  sudo systemctl daemon-reload"
    print_status "  sudo systemctl enable osot-api"
    print_status "  sudo systemctl start osot-api"
else
    print_status "Systemd service file already exists, skipping creation"
fi

# Create nginx configuration template
NGINX_CONFIG="/etc/nginx/sites-available/osot-api"
if [[ ! -f "$NGINX_CONFIG" ]] && command -v nginx &> /dev/null; then
    print_status "Creating nginx configuration template..."
    cat > "$NGINX_CONFIG" << EOF
server {
    listen 80;
    server_name your-api-domain.com;

    # Upload size limit
    client_max_body_size 10M;

    # API proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files (uploads)
    location /uploads/ {
        alias $UPLOAD_DIR/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF
    print_success "Nginx configuration template created: $NGINX_CONFIG"
    print_status "To enable the site:"
    print_status "  sudo ln -s $NGINX_CONFIG /etc/nginx/sites-enabled/"
    print_status "  sudo nginx -t"
    print_status "  sudo systemctl reload nginx"
else
    if [[ -f "$NGINX_CONFIG" ]]; then
        print_status "Nginx configuration already exists, skipping creation"
    else
        print_status "Nginx not installed, skipping nginx configuration"
    fi
fi

print_success "Deployment setup completed successfully!"
print_status ""
print_status "Next steps:"
print_status "1. Update the .env file with your actual configuration"
print_status "2. Copy your application files to $APP_DIR"
print_status "3. Install dependencies: npm install --production"
print_status "4. Build the application: npm run build"
print_status "5. Set up the database and run migrations"
print_status "6. Enable and start the systemd service"
print_status "7. Configure nginx (if using)"
print_status ""
print_status "Upload directory: $UPLOAD_DIR"
print_status "Logs directory: $LOGS_DIR"
print_status "Service file: $SERVICE_FILE"
if [[ -f "$NGINX_CONFIG" ]]; then
    print_status "Nginx config: $NGINX_CONFIG"
fi
