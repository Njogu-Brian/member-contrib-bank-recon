# .htaccess Fix for MIME Type Error

## Problem:
JavaScript files are being served with MIME type `text/html` instead of `application/javascript`, causing the browser error:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"
```

## Solution:
Updated `.htaccess` file with:
1. **MIME type configuration** for JavaScript, CSS, JSON, and SVG files
2. **Explicit exclusion** of `/assets/` folder from rewrite rules

## Updated .htaccess Features:

### 1. MIME Type Configuration
```apache
<IfModule mod_mime.c>
  AddType application/javascript js
  AddType text/css css
  AddType application/json json
  AddType image/svg+xml svg
</IfModule>
```

### 2. Assets Folder Exclusion
```apache
# Don't rewrite assets folder - serve files directly with correct MIME types
RewriteCond %{REQUEST_URI} ^/assets/
RewriteRule ^ - [L]
```

## Deployment Steps:

1. **Extract the updated `frontend_dist.zip`** in cPanel File Manager
   - Right-click `frontend_dist.zip` → Extract
   - This will replace the existing `.htaccess` file

2. **Verify the .htaccess file** is updated in the root directory

3. **Clear browser cache** and test:
   - Hard refresh: `Ctrl + Shift + R`
   - Visit: `https://evimeria.breysomsolutions.co.ke/login`

4. **Check browser console** - the MIME type error should be gone

## Manual Update (if needed):

If you prefer to update manually, replace the entire `.htaccess` file in the root of `evimeria.breysomsolutions.co.ke/` with the new content from `frontend/dist/.htaccess`.

