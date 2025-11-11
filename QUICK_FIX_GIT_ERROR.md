# Quick Fix: GitHub Authentication Error in cPanel

## The Error You're Seeing

```
Error: (XID ed89pz) "/usr/local/cpanel/3rdparty/bin/git" reported error code "128" 
when it ended: fatal: could not read Username for 'https://github.com': 
No such device or address
```

## Quick Solution: Clone Manually via SSH

cPanel's Git interface cannot handle GitHub authentication. Clone the repository manually via SSH instead.

### Step 1: Open Terminal/SSH

Access your server via SSH (use cPanel's "Terminal" or SSH client like PuTTY).

### Step 2: Fix the Path Issue

I notice your path has a space and wrong directory name:
- ❌ Wrong: `/home2/royalce1/ laravel-app/member-contributions` (has space, wrong name)
- ✅ Correct: `/home2/royalce1/laravel-ap/member-contributions` (no space, correct name)

### Step 3: Create Directory and Clone

```bash
# Navigate to home directory
cd ~

# Create directory (fix the path - no space, correct name)
mkdir -p laravel-ap/member-contributions

# Navigate into it
cd laravel-ap/member-contributions

# Clone repository
git clone https://github.com/Njogu-Brian/member-contrib-bank-recon.git .
```

### Step 4: If Repository is Private

If the repository is private, you have two options:

**Option A: Use Personal Access Token**

1. Create a token on GitHub:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select `repo` scope
   - Copy the token

2. Clone with token:
```bash
git clone https://YOUR_TOKEN@github.com/Njogu-Brian/member-contrib-bank-recon.git .
```

**Option B: Use SSH (if SSH keys are configured)**

```bash
git clone git@github.com:Njogu-Brian/member-contrib-bank-recon.git .
```

### Step 5: Verify Clone

```bash
# List files
ls -la

# You should see:
# backend/
# frontend/
# ocr-parser/
# matching-service/
# deploy.sh
# etc.
```

## Why This Happens

1. **GitHub Authentication**: Private repositories or GitHub's new authentication requirements
2. **cPanel Limitation**: cPanel's Git interface cannot prompt for credentials
3. **Path Issues**: Spaces or invalid characters in the path

## Alternative: Make Repository Public (Temporary)

If you want to use cPanel's Git interface:

1. Go to GitHub repository settings
2. Scroll down to "Danger Zone"
3. Change repository to public (temporary)
4. Clone via cPanel
5. Change back to private

**Note**: This exposes your code publicly, so only do this if you're comfortable with that.

## After Successful Clone

Continue with deployment:

```bash
# Setup backend
cd ~/laravel-ap/member-contributions/backend
composer install --optimize-autoloader --no-dev
cp .env.example .env
# Edit .env with your database credentials
php artisan key:generate
php artisan migrate --force

# Setup frontend
cd ../frontend
npm install
npm run build

# Setup public directory
mkdir -p ~/public_html/statement
cp -r ~/laravel-ap/member-contributions/frontend/dist/* ~/public_html/statement/
cp ~/laravel-ap/member-contributions/public-index-cpanel.php ~/public_html/statement/index.php
# Edit index.php and update $appPath to: /home2/royalce1/laravel-ap/member-contributions/backend
```

## Important Notes

1. **Path Must Be Correct**:
   - ✅ `/home2/royalce1/laravel-ap/member-contributions`
   - ❌ `/home2/royalce1/ laravel-app/member-contributions` (has space, wrong name)

2. **Use SSH Terminal**: cPanel's Git interface has limitations with authentication

3. **Repository Access**: Make sure you have access to the repository on GitHub

## Next Steps

See [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md) for complete deployment guide.

## Still Having Issues?

1. Verify repository URL is correct
2. Check if repository is private (requires authentication)
3. Try cloning via SSH manually
4. Check file permissions on server
5. Verify directory path is correct (no spaces, valid characters)

For more details, see [CPANEL_GIT_SETUP.md](CPANEL_GIT_SETUP.md).

