#!/bin/bash

# Deployment Script for cPanel
# This script automates the deployment process for the Member Contributions application

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration - Update these paths based on your cPanel setup
APP_DIR="$HOME/laravel-ap/member-contributions"
PUBLIC_DIR="$HOME/public_html/statement"
# If your domain folder is different, update this:
# PUBLIC_DIR="$HOME/breysomsolutions.co.ke/public_html/statement"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Member Contributions Deployment Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: Application directory not found: $APP_DIR${NC}"
    echo "Please update APP_DIR in deploy.sh or create the directory first."
    exit 1
fi

cd "$APP_DIR"

# Step 1: Pull latest changes
echo -e "${YELLOW}[1/8] Pulling latest changes from repository...${NC}"
git pull origin master || {
    echo -e "${RED}Error: Failed to pull from repository${NC}"
    exit 1
}
echo -e "${GREEN}✓ Repository updated${NC}"
echo ""

# Step 2: Backend - Install dependencies
echo -e "${YELLOW}[2/8] Installing backend dependencies...${NC}"
cd "$APP_DIR/backend"
composer install --optimize-autoloader --no-dev --no-interaction || {
    echo -e "${RED}Error: Failed to install backend dependencies${NC}"
    exit 1
}
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Step 3: Backend - Run migrations
echo -e "${YELLOW}[3/8] Running database migrations...${NC}"
php artisan migrate --force || {
    echo -e "${YELLOW}Warning: Migration failed. Please check database connection.${NC}"
}
echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Step 4: Backend - Cache configuration
echo -e "${YELLOW}[4/8] Caching configuration and routes...${NC}"
php artisan config:cache || {
    echo -e "${YELLOW}Warning: Config cache failed${NC}"
}
php artisan route:cache || {
    echo -e "${YELLOW}Warning: Route cache failed${NC}"
}
php artisan view:cache || {
    echo -e "${YELLOW}Warning: View cache failed${NC}"
}
php artisan optimize || {
    echo -e "${YELLOW}Warning: Optimization failed${NC}"
}
echo -e "${GREEN}✓ Configuration cached${NC}"
echo ""

# Step 5: Frontend - Install dependencies
echo -e "${YELLOW}[5/8] Installing frontend dependencies...${NC}"
cd "$APP_DIR/frontend"
npm install --production || {
    echo -e "${RED}Error: Failed to install frontend dependencies${NC}"
    exit 1
}
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Step 6: Frontend - Build
echo -e "${YELLOW}[6/8] Building frontend for production...${NC}"
npm run build || {
    echo -e "${RED}Error: Frontend build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# Step 7: Copy public files
echo -e "${YELLOW}[7/8] Copying public files to domain directory...${NC}"
if [ ! -d "$PUBLIC_DIR" ]; then
    echo -e "${YELLOW}Creating public directory: $PUBLIC_DIR${NC}"
    mkdir -p "$PUBLIC_DIR"
fi

# Copy built frontend files
cp -r "$APP_DIR/frontend/dist/"* "$PUBLIC_DIR/" || {
    echo -e "${RED}Error: Failed to copy frontend files${NC}"
    exit 1
}

# Copy Laravel's public index.php (customized for cPanel)
cp "$APP_DIR/backend/public/index.php" "$PUBLIC_DIR/index.php" || {
    echo -e "${RED}Error: Failed to copy index.php${NC}"
    exit 1
}

# Copy .htaccess if it doesn't exist
if [ ! -f "$PUBLIC_DIR/.htaccess" ]; then
    cp "$APP_DIR/backend/public/.htaccess" "$PUBLIC_DIR/.htaccess" || {
        echo -e "${YELLOW}Warning: Failed to copy .htaccess${NC}"
    }
fi

echo -e "${GREEN}✓ Public files copied${NC}"
echo ""

# Step 8: Restart queue worker
echo -e "${YELLOW}[8/8] Restarting queue worker...${NC}"
cd "$APP_DIR/backend"
php artisan queue:restart || {
    echo -e "${YELLOW}Warning: Queue restart failed. You may need to restart manually.${NC}"
}
echo -e "${GREEN}✓ Queue worker restarted${NC}"
echo ""

# Final summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Verify the application is accessible at your domain"
echo "2. Check queue worker is running: php artisan queue:work"
echo "3. Monitor logs: tail -f backend/storage/logs/laravel.log"
echo ""
echo -e "${YELLOW}Note: If you're using PM2 for services, restart them manually:${NC}"
echo "  pm2 restart ocr-parser"
echo "  pm2 restart matching-service"
echo ""

