# Fix 404 Errors for Assets Files

## Problem:
Getting 404 errors for:
- `/assets/index-B6GDQrFB.css`
- `/assets/index-BHxzd3y0.js`

## Solution:

### Step 1: Verify Assets Folder Location

In cPanel File Manager, navigate to: `evimeria.breysomsolutions.co.ke/`

You should see:
- ✅ `index.html` (in root)
- ✅ `.htaccess` (in root)
- ✅ `assets/` folder (in root) ← **This is critical!**

### Step 2: Check Assets Folder Contents

Open the `assets/` folder and verify it contains:
- ✅ `index-B6GDQrFB.css` (77.45 KB)
- ✅ `index-BHxzd3y0.js` (1.79 MB)
- ✅ `pdf.worker.min-DKQKFyKK.js` (1.04 MB)

### Step 3: If Assets Folder is Missing or Has Wrong Files

**Option A: Extract from Zip Again**
1. In cPanel, go to `evimeria.breysomsolutions.co.ke/`
2. Right-click `frontend_dist.zip` → **Extract**
3. Make sure it extracts to the **root directory**, not a subfolder
4. Verify the `assets/` folder appears in the root

**Option B: Upload Assets Folder Manually**
1. Extract `frontend_dist.zip` on your local machine
2. Upload the entire `assets/` folder to: `evimeria.breysomsolutions.co.ke/assets/`
3. Make sure files are inside the `assets/` folder, not in root

### Step 4: Verify File Permissions

Set permissions:
- `assets/` folder: **755**
- Files inside `assets/`: **644**

To set in cPanel:
1. Select file/folder
2. Click "Permissions"
3. Set: 755 for folders, 644 for files

### Step 5: Test Direct Access

Try accessing files directly in browser:
- `https://evimeria.breysomsolutions.co.ke/assets/index-BHxzd3y0.js`
- `https://evimeria.breysomsolutions.co.ke/assets/index-B6GDQrFB.css`

If these URLs work, the files are in the right place.
If you get 404, the files are missing or in wrong location.

### Step 6: Clear Browser Cache

After fixing:
1. Hard refresh: `Ctrl + Shift + R`
2. Or clear browser cache completely
3. Test again

## Common Issues:

**Issue:** Assets folder is in wrong location
- ❌ `evimeria.breysomsolutions.co.ke/dist/assets/` (wrong)
- ✅ `evimeria.breysomsolutions.co.ke/assets/` (correct)

**Issue:** Files extracted to subfolder
- When extracting zip, make sure files go to root, not `dist/` subfolder

**Issue:** Old files still present
- Delete old files in `assets/` folder before uploading new ones
- Or replace them with files from the new zip

