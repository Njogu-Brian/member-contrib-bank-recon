# How to Extract frontend_dist.zip in cPanel

## Steps to Fix the MIME Type Error:

### 1. Extract the ZIP File in cPanel

1. In cPanel File Manager, navigate to: `evimeria.breysomsolutions.co.ke/`
2. You should see `frontend_dist.zip` in the file list
3. **Right-click** on `frontend_dist.zip` → Select **"Extract"**
4. This will extract:
   - `index.html`
   - `.htaccess`
   - `assets/` folder (with all JS and CSS files)

### 2. Verify Files Are in Root Directory

After extraction, you should see in the root of `evimeria.breysomsolutions.co.ke/`:
- ✅ `index.html` (should be updated/replaced)
- ✅ `.htaccess` (should be updated/replaced)
- ✅ `assets/` folder (should contain the new JS files)

### 3. Check the assets Folder

Open the `assets/` folder and verify it contains:
- `index-BHxzd3y0.js` (or similar - the hash may vary)
- `index-B6GDQrFB.css` (or similar)
- `pdf.worker.min-DKQKFyKK.js` (or similar)

### 4. Set Correct Permissions

Make sure files have correct permissions:
- Files: **644**
- Folders: **755**

To set permissions in cPanel:
1. Select the file/folder
2. Click "Permissions" button
3. Set to 644 for files, 755 for folders

### 5. Clear Browser Cache

After extraction:
1. Hard refresh the page: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Or clear browser cache completely
3. Visit: `https://evimeria.breysomsolutions.co.ke/login`

### 6. Verify .htaccess File

The `.htaccess` file should contain MIME type configurations. If the MIME error persists, the `.htaccess` might need to be updated.

## Troubleshooting:

**If MIME error still appears:**
- Check that `assets/` folder exists and contains the JS files
- Verify `.htaccess` file is in the root directory
- Check file permissions (644 for files, 755 for folders)
- Try accessing the JS file directly: `https://evimeria.breysomsolutions.co.ke/assets/index-BHxzd3y0.js`
  - If it shows HTML instead of JavaScript, the file path is wrong
  - If it shows 404, the file doesn't exist in that location

**If files are in wrong location:**
- Make sure files are extracted to: `evimeria.breysomsolutions.co.ke/` (root)
- NOT in: `evimeria.breysomsolutions.co.ke/dist/` or any subfolder

