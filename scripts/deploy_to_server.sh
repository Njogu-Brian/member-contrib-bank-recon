#!/bin/bash
# SSH Deployment Script for Linux/Mac
# Deploys code to production server via SSH

set -e

# Configuration (modify these or pass as arguments)
SSH_HOST="${1:-}"
SSH_USER="${2:-}"
SSH_KEY="${3:-}"
SSH_PORT="${4:-22}"
SERVER_PATH="${5:-/var/www/html}"
FRONTEND_API_URL="${6:-/api/v1}"

# Check if required parameters are provided
if [ -z "$SSH_HOST" ] || [ -z "$SSH_USER" ]; then
    echo "Usage: $0 <ssh_host> <ssh_user> [ssh_key] [ssh_port] [server_path] [api_url]"
    echo ""
    echo "Example:"
    echo "  $0 evimeria.breysomsolutions.co.ke username ~/.ssh/id_rsa 22 /var/www/html /api/v1"
    echo ""
    echo "Or export environment variables:"
    echo "  export SSH_HOST=evimeria.breysomsolutions.co.ke"
    echo "  export SSH_USER=username"
    echo "  export SSH_KEY=~/.ssh/id_rsa"
    echo "  $0"
    exit 1
fi

# Build SSH command
SSH_CMD="ssh"
if [ "$SSH_PORT" != "22" ]; then
    SSH_CMD="$SSH_CMD -p $SSH_PORT"
fi
if [ -n "$SSH_KEY" ]; then
    SSH_CMD="$SSH_CMD -i $SSH_KEY"
fi
SSH_CMD="$SSH_CMD ${SSH_USER}@${SSH_HOST}"

echo "========================================"
echo "   SSH Production Deployment"
echo "========================================"
echo ""
echo "Server: ${SSH_USER}@${SSH_HOST}"
echo "Path: ${SERVER_PATH}"
echo ""

# Step 1: Pull latest code
echo "==> Step 1: Pulling latest code from Git"
$SSH_CMD "cd ${SERVER_PATH} && git pull origin master"
if [ $? -ne 0 ]; then
    echo "ERROR: Git pull failed!"
    exit 1
fi
echo "  ✓ Code pulled successfully"
echo ""

# Step 2: Backend Deployment
echo "==> Step 2: Deploying Backend"
$SSH_CMD "cd ${SERVER_PATH}/backend && \
    composer install --no-dev --optimize-autoloader && \
    php artisan migrate --force && \
    php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache && \
    php artisan queue:restart"
if [ $? -eq 0 ]; then
    echo "  ✓ Backend deployed successfully"
else
    echo "  ⚠ WARNING: Backend deployment may have issues"
fi
echo ""

# Step 3: Frontend Deployment
echo "==> Step 3: Building Frontend"
$SSH_CMD "cd ${SERVER_PATH}/frontend && \
    export VITE_API_BASE_URL='${FRONTEND_API_URL}' && \
    npm install && \
    npm run build"
if [ $? -eq 0 ]; then
    echo "  ✓ Frontend built successfully"
else
    echo "  ⚠ WARNING: Frontend build may have issues"
fi
echo ""

# Step 4: Verify deployment
echo "==> Step 4: Verifying Deployment"
$SSH_CMD "cd ${SERVER_PATH}/frontend && test -d dist && echo 'Frontend dist exists' || echo 'Frontend dist missing'"
echo ""

echo "========================================"
echo "   Deployment Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Verify frontend/dist/ exists on server"
echo "  2. Copy frontend/dist/ contents to web root (if needed)"
echo "  3. Test the application in browser"
echo "  4. Check browser console for errors"
echo ""









