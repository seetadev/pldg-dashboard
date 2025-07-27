#!/bin/bash

# PLDG Dashboard EC2 Deployment Script
# Production-grade deployment with PM2 and monitoring

set -e  # Exit on any error

# Configuration
APP_NAME="pldg-dashboard"
APP_DIR="/var/www/$APP_NAME"
USER="ubuntu"
NODE_VERSION="18"
PM2_INSTANCES="max"
PORT=${PORT:-3000}
ENV=${NODE_ENV:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Node.js via NodeSource
install_nodejs() {
    log "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    log "Node.js installed: $node_version"
    log "npm installed: $npm_version"
}

# Function to install PM2 globally
install_pm2() {
    log "Installing PM2 globally..."
    sudo npm install -g pm2@latest
    
    # Setup PM2 startup script
    sudo pm2 startup systemd -u $USER --hp /home/$USER
    pm2 save
    
    log "PM2 installed and configured for startup"
}

# Function to install system dependencies
install_system_dependencies() {
    log "Updating system packages..."
    sudo apt-get update
    
    log "Installing system dependencies..."
    sudo apt-get install -y \
        curl \
        git \
        build-essential \
        nginx \
        certbot \
        python3-certbot-nginx \
        htop \
        vim \
        unzip \
        supervisor
}

# Function to setup application directory
setup_app_directory() {
    log "Setting up application directory..."
    
    if [ ! -d "$APP_DIR" ]; then
        sudo mkdir -p $APP_DIR
        sudo chown -R $USER:$USER $APP_DIR
    fi
    
    # Create logs directory
    sudo mkdir -p $APP_DIR/logs
    sudo chown -R $USER:$USER $APP_DIR/logs
}

# Function to clone/update repository
update_repository() {
    log "Updating repository..."
    
    cd $APP_DIR
    
    if [ ! -d ".git" ]; then
        log "Cloning repository..."
        git clone ${REPO_URL:-"https://github.com/YOUR_ORG/pldg-dashboard.git"} .
    else
        log "Pulling latest changes..."
        git fetch origin
        git reset --hard origin/main
    fi
    
    # Set proper permissions
    sudo chown -R $USER:$USER $APP_DIR
}

# Function to install npm dependencies
install_dependencies() {
    log "Installing npm dependencies..."
    cd $APP_DIR
    
    # Clean install for production
    rm -rf node_modules package-lock.json
    npm ci --production=false
    
    # Install PM2 if not already installed
    if ! command_exists pm2; then
        install_pm2
    fi
}

# Function to build application
build_application() {
    log "Building application..."
    cd $APP_DIR
    
    # Set environment variables
    export NODE_ENV=$ENV
    export PORT=$PORT
    
    # Build the application
    npm run build
    
    log "Application built successfully"
}

# Function to setup environment file
setup_environment() {
    log "Setting up environment configuration..."
    cd $APP_DIR
    
    # Create .env.production if it doesn't exist
    if [ ! -f ".env.production" ]; then
        cat > .env.production << EOF
NODE_ENV=production
PORT=$PORT

# Database
MONGODB_URI=\${MONGODB_URI}

# Security
CORS_ORIGINS=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
TRUSTED_PROXIES=1

# Logging
LOG_LEVEL=info
ENABLE_CONSOLE_LOGS=false
ENABLE_FILE_LOGS=true
LOG_DIRECTORY=$APP_DIR/logs
LOG_MAX_FILE_SIZE=20m
LOG_MAX_FILES=14d

# Sentry (Error Tracking)
SENTRY_DSN=\${SENTRY_DSN}
SENTRY_ENVIRONMENT=production

# External APIs
GITHUB_TOKEN=\${GITHUB_TOKEN}
AIRTABLE_API_KEY=\${AIRTABLE_API_KEY}
AIRTABLE_BASE_ID=\${AIRTABLE_BASE_ID}
ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY}
EOF
        warning "Environment file created. Please update with your actual values."
    fi
}

# Function to setup PM2 ecosystem file
setup_pm2_config() {
    log "Setting up PM2 configuration..."
    cd $APP_DIR
    
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: '$APP_NAME',
      script: 'npm',
      args: 'start',
      cwd: '$APP_DIR',
      instances: '$PM2_INSTANCES',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: '$ENV',
        PORT: $PORT
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: $PORT
      },
      // Logging
      log_file: '$APP_DIR/logs/app.log',
      out_file: '$APP_DIR/logs/out.log',
      error_file: '$APP_DIR/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Monitoring
      monitoring: true,
      
      // Auto-restart on crashes
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Memory management
      max_memory_restart: '1G',
      
      // Health checks
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Performance
      node_args: '--max-old-space-size=2048'
    }
  ],
  
  deploy: {
    production: {
      user: '$USER',
      host: 'localhost',
      ref: 'origin/main',
      repo: '${REPO_URL:-"https://github.com/YOUR_ORG/pldg-dashboard.git"}',
      path: '$APP_DIR',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
EOF
}

# Function to setup Nginx configuration
setup_nginx() {
    log "Setting up Nginx configuration..."
    
    sudo tee /etc/nginx/sites-available/$APP_NAME << EOF
upstream $APP_NAME {
    server 127.0.0.1:$PORT;
    keepalive 64;
}

server {
    listen 80;
    server_name \${SERVER_NAME:-localhost};
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/json application/xml+rss;
    
    # Rate limiting
    limit_req_zone \\\$binary_remote_addr zone=api:10m rate=10r/s;
    
    # Static files
    location /_next/static {
        proxy_cache STATIC;
        proxy_pass http://$APP_NAME;
        
        # Cache static files for 1 year
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://$APP_NAME;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://$APP_NAME;
        access_log off;
    }
    
    # All other requests
    location / {
        proxy_pass http://$APP_NAME;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Security
    location ~ /\\. {
        deny all;
    }
}
EOF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # Test and reload Nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    log "Nginx configured and reloaded"
}

# Function to setup SSL with Let's Encrypt
setup_ssl() {
    if [ ! -z "\${SERVER_NAME}" ] && [ "\${SERVER_NAME}" != "localhost" ]; then
        log "Setting up SSL certificate with Let's Encrypt..."
        sudo certbot --nginx -d \${SERVER_NAME} --non-interactive --agree-tos --email \${SSL_EMAIL:-admin@\${SERVER_NAME}}
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
        
        log "SSL certificate configured"
    else
        warning "SERVER_NAME not set or is localhost. Skipping SSL setup."
    fi
}

# Function to start/restart the application
start_application() {
    log "Starting application with PM2..."
    cd $APP_DIR
    
    # Stop existing processes
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Start new process
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    # Wait for startup
    sleep 5
    
    # Check if application is running
    if pm2 show $APP_NAME > /dev/null 2>&1; then
        log "Application started successfully"
        pm2 status
    else
        error "Failed to start application"
    fi
}

# Function to setup monitoring and logging
setup_monitoring() {
    log "Setting up monitoring and log rotation..."
    
    # Setup logrotate for application logs
    sudo tee /etc/logrotate.d/$APP_NAME << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    # Setup PM2 monitoring
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 10M
    pm2 set pm2-logrotate:retain 30
    pm2 set pm2-logrotate:compress true
    
    log "Monitoring and log rotation configured"
}

# Function to run health checks
health_check() {
    log "Running health checks..."
    
    # Wait for application to fully start
    sleep 10
    
    # Check if port is listening
    if netstat -tulpn | grep :$PORT > /dev/null; then
        log "✓ Application is listening on port $PORT"
    else
        error "✗ Application is not listening on port $PORT"
    fi
    
    # Check HTTP response
    if curl -f -s http://localhost:$PORT/health > /dev/null; then
        log "✓ Health check endpoint responding"
    else
        warning "✗ Health check endpoint not responding"
    fi
    
    # Check PM2 status
    if pm2 show $APP_NAME | grep -q "online"; then
        log "✓ PM2 reports application as online"
    else
        error "✗ PM2 reports application as not online"
    fi
    
    # Check Nginx status
    if sudo systemctl is-active nginx > /dev/null; then
        log "✓ Nginx is active"
    else
        warning "✗ Nginx is not active"
    fi
    
    log "Health checks completed"
}

# Main deployment function
deploy() {
    log "Starting deployment of $APP_NAME..."
    
    # Check system requirements
    if ! command_exists node; then
        install_nodejs
    fi
    
    if ! command_exists nginx; then
        install_system_dependencies
    fi
    
    if ! command_exists pm2; then
        install_pm2
    fi
    
    # Deployment steps
    setup_app_directory
    update_repository
    setup_environment
    install_dependencies
    build_application
    setup_pm2_config
    setup_nginx
    setup_monitoring
    start_application
    setup_ssl
    health_check
    
    log "Deployment completed successfully!"
    log "Application is running at: http://\${SERVER_NAME:-localhost}"
    
    # Display status
    echo -e "\n${GREEN}=== Application Status ===${NC}"
    pm2 status
    echo -e "\n${GREEN}=== Useful Commands ===${NC}"
    echo "  View logs: pm2 logs $APP_NAME"
    echo "  Restart app: pm2 restart $APP_NAME"
    echo "  Monitor app: pm2 monit"
    echo "  Nginx status: sudo systemctl status nginx"
    echo "  View Nginx logs: sudo tail -f /var/log/nginx/access.log"
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help        Show this help message"
    echo "  -e, --env ENV     Set environment (default: production)"
    echo "  -p, --port PORT   Set port (default: 3000)"
    echo "  -u, --user USER   Set user (default: ubuntu)"
    echo ""
    echo "Environment variables:"
    echo "  REPO_URL         Repository URL"
    echo "  SERVER_NAME      Domain name for SSL"
    echo "  SSL_EMAIL        Email for Let's Encrypt"
    echo "  MONGODB_URI      MongoDB connection string"
    echo "  SENTRY_DSN       Sentry DSN for error tracking"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -e|--env)
            ENV="$2"
            shift 2
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -u|--user)
            USER="$2"
            shift 2
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run deployment
deploy