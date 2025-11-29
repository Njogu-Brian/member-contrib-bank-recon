#!/bin/bash
# Frontend build script with memory limit fix

cd frontend

echo "Building frontend with increased memory limit..."

# Set Node.js memory limit to 4GB
export NODE_OPTIONS="--max-old-space-size=4096"

# Build
npm run build

# Deploy to public_html
if [ -d "dist" ]; then
    echo "Deploying to public_html..."
    cp -r dist/* ~/public_html/
    echo "✓ Frontend deployed successfully!"
else
    echo "Error: dist folder not found after build"
    exit 1
fi

