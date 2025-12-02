#!/bin/bash
# Script to update remote server repository via SSH
# This discards local cache changes and forces a pull from remote

# Configuration - Update these with your server details
SERVER_USER="your_username"  # Replace with your cPanel username
SERVER_HOST="rs2.noc254.com"  # Or your server IP
REPO_PATH="/home2/royalce1/laravel-app/evimeria"
REMOTE_BRANCH="master"

echo "Connecting to server and updating repository..."
echo ""

# SSH into server and execute git commands
ssh ${SERVER_USER}@${SERVER_HOST} << EOF
    cd ${REPO_PATH}
    echo "Current directory: \$(pwd)"
    echo ""
    
    # Show current status
    echo "=== Current Git Status ==="
    git status --short
    echo ""
    
    # Discard all local changes (cache files, logs, etc.)
    echo "=== Discarding local changes ==="
    git reset --hard HEAD
    git clean -fd
    
    # Ensure we're on the correct branch
    echo ""
    echo "=== Checking out ${REMOTE_BRANCH} branch ==="
    git checkout ${REMOTE_BRANCH}
    
    # Force fetch and reset to match remote
    echo ""
    echo "=== Fetching latest changes from remote ==="
    git fetch origin ${REMOTE_BRANCH}
    
    # Reset to match remote exactly
    echo ""
    echo "=== Resetting to match remote repository ==="
    git reset --hard origin/${REMOTE_BRANCH}
    
    # Show final status
    echo ""
    echo "=== Final Status ==="
    git status
    echo ""
    echo "=== Latest Commit ==="
    git log -1 --oneline
    echo ""
    echo "Repository update complete!"
EOF

echo ""
echo "Remote server update script completed!"

