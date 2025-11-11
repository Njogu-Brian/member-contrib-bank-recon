# cPanel Git Setup - Troubleshooting Guide

## Issue: GitHub Authentication Error

If you're getting the error:
```
fatal: could not read Username for 'https://github.com': No such device or address
```

This means GitHub requires authentication, and cPanel's Git interface cannot prompt for credentials.

## Solutions

### Solution 1: Clone Manually via SSH (Recommended)

This is the easiest and most reliable method.

#### Step 1: SSH into Your Server

```bash
ssh your-username@your-server.com
```

#### Step 2: Create Directory Structure

```bash
# Navigate to home directory
cd ~

# Create the correct directory (note: laravel-ap, not laravel-app, and no spaces)
mkdir -p laravel-ap/member-contributions

# Navigate into it
cd laravel-ap/member-contributions
```

#### Step 3: Clone Repository

**If repository is PUBLIC:**
```bash
git clone https://github.com/Njogu-Brian/member-contrib-bank-recon.git .
```

**If repository is PRIVATE, use one of these methods:**

**Option A: Use Personal Access Token (PAT)**
```bash
# Create a Personal Access Token on GitHub:
# 1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
# 2. Generate new token with 'repo' permissions
# 3. Use it in the clone URL:

git clone https://YOUR_TOKEN@github.com/Njogu-Brian/member-contrib-bank-recon.git .
```

**Option B: Use SSH (if SSH keys are set up)**
```bash
# First, set up SSH keys if not already done:
# 1. Generate SSH key: ssh-keygen -t ed25519 -C "your_email@example.com"
# 2. Add to GitHub: Settings → SSH and GPG keys → New SSH key
# 3. Then clone using SSH:

git clone git@github.com:Njogu-Brian/member-contrib-bank-recon.git .
```

#### Step 4: Verify Clone

```bash
# Verify files are cloned
ls -la

# You should see: backend/, frontend/, ocr-parser/, etc.
```

### Solution 2: Use cPanel Git with Public Repository

If your repository is public, you can use cPanel's Git interface, but you need to fix the path:

1. **Repository Path**: `/home2/royalce1/laravel-ap/member-contributions`
   - Remove the space before "laravel-app"
   - Use "laravel-ap" (not "laravel-app")
   - No trailing spaces

2. **Clone URL**: `https://github.com/Njogu-Brian/member-contrib-bank-recon.git`

3. **Repository Name**: `member-contributions`

### Solution 3: Make Repository Public (Not Recommended)

If you make the repository public on GitHub, cPanel can clone it without authentication. However, this exposes your code publicly.

## Correct Directory Structure

```
/home2/royalce1/
├── laravel-ap/                          # Note: "laravel-ap" not "laravel-app"
│   └── member-contributions/            # No spaces in path
│       ├── backend/
│       ├── frontend/
│       ├── ocr-parser/
│       ├── matching-service/
│       └── ...
└── public_html/
    └── statement/
```

## Common Issues and Fixes

### Issue 1: Invalid Path Characters

**Error**: Path contains invalid characters

**Fix**: 
- Remove spaces from path
- Use: `/home2/royalce1/laravel-ap/member-contributions`
- Not: `/home2/royalce1/ laravel-app/member-contributions`

### Issue 2: Authentication Required

**Error**: `fatal: could not read Username for 'https://github.com'`

**Fix**: 
- Use SSH to clone manually (Solution 1)
- Or use Personal Access Token in URL
- Or set up SSH keys for GitHub

### Issue 3: Directory Doesn't Exist

**Error**: Directory not found

**Fix**: 
- Create directory first: `mkdir -p ~/laravel-ap/member-contributions`
- Then clone into it

### Issue 4: Permission Denied

**Error**: Permission denied

**Fix**: 
- Check directory permissions: `ls -la ~/laravel-ap/`
- Create directory with correct permissions: `mkdir -p ~/laravel-ap/member-contributions`
- Verify ownership: `chown -R your-username:your-username ~/laravel-ap/`

## Step-by-Step: Manual Clone via SSH

### 1. Connect via SSH

```bash
ssh your-username@your-server.com
```

### 2. Navigate to Home Directory

```bash
cd ~
```

### 3. Create Directory

```bash
mkdir -p laravel-ap/member-contributions
cd laravel-ap/member-contributions
```

### 4. Clone Repository

**For Public Repository:**
```bash
git clone https://github.com/Njogu-Brian/member-contrib-bank-recon.git .
```

**For Private Repository (with PAT):**
```bash
# Replace YOUR_TOKEN with your GitHub Personal Access Token
git clone https://YOUR_TOKEN@github.com/Njogu-Brian/member-contrib-bank-recon.git .
```

**For Private Repository (with SSH):**
```bash
git clone git@github.com:Njogu-Brian/member-contrib-bank-recon.git .
```

### 5. Verify

```bash
ls -la
# Should show: backend/, frontend/, ocr-parser/, matching-service/, etc.
```

### 6. Set Up Remote (if needed)

```bash
# Check current remote
git remote -v

# If needed, update remote URL
git remote set-url origin https://github.com/Njogu-Brian/member-contrib-bank-recon.git
```

## Setting Up GitHub Personal Access Token

1. Go to GitHub.com
2. Click your profile → Settings
3. Developer settings → Personal access tokens → Tokens (classic)
4. Generate new token (classic)
5. Select scopes: `repo` (full control of private repositories)
6. Generate token and copy it
7. Use it in clone URL: `https://YOUR_TOKEN@github.com/username/repo.git`

## Setting Up SSH Keys for GitHub

1. **Generate SSH Key:**
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Enter a passphrase (optional but recommended)
```

2. **Copy Public Key:**
```bash
cat ~/.ssh/id_ed25519.pub
# Copy the output
```

3. **Add to GitHub:**
   - Go to GitHub.com → Settings → SSH and GPG keys
   - Click "New SSH key"
   - Paste your public key
   - Save

4. **Test Connection:**
```bash
ssh -T git@github.com
# Should say: "Hi username! You've successfully authenticated..."
```

## After Successful Clone

Once the repository is cloned, continue with the deployment steps:

1. **Setup Backend:**
```bash
cd ~/laravel-ap/member-contributions/backend
composer install --optimize-autoloader --no-dev
cp .env.example .env
# Edit .env with your database credentials
php artisan key:generate
php artisan migrate --force
```

2. **Setup Frontend:**
```bash
cd ../frontend
npm install
npm run build
```

3. **Setup Public Directory:**
```bash
mkdir -p ~/public_html/statement
cp -r ~/laravel-ap/member-contributions/frontend/dist/* ~/public_html/statement/
cp ~/laravel-ap/member-contributions/public-index-cpanel.php ~/public_html/statement/index.php
# Edit index.php and update $appPath
```

For complete deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Troubleshooting

### Check Git is Installed

```bash
git --version
```

### Check Repository URL

```bash
git remote -v
```

### Check Directory Permissions

```bash
ls -la ~/laravel-ap/
```

### Check GitHub Access

```bash
# Test HTTPS access
curl -I https://github.com/Njogu-Brian/member-contrib-bank-recon.git

# Test SSH access (if keys are set up)
ssh -T git@github.com
```

## Next Steps

After successfully cloning the repository:

1. Follow [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md) for complete setup
2. Configure database in cPanel
3. Set up environment variables
4. Build and deploy frontend
5. Configure public directory
6. Set up queue worker

## Support

If you continue to have issues:

1. Check GitHub repository is accessible
2. Verify SSH keys are set up correctly
3. Check cPanel file permissions
4. Verify directory path is correct (no spaces, correct name)
5. Try cloning manually via SSH terminal

For more help, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Quick reference
- [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md) - Step-by-step instructions

