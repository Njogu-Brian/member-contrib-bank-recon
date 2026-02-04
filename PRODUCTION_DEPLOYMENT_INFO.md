# Production Deployment Information

## SSH Access
- **Command**: `ssh -p 1980 royalce1@breysomsolutions.co.ke`
- **Port**: 1980
- **User**: royalce1
- **Host**: breysomsolutions.co.ke

## Project Directories

### 1. Backend & Frontend Source Code
- **Location**: `~/laravel-app/evimeria/`
- **Git Repository**: Points to this folder
- **Contains**:
  - `backend/` - Laravel backend application
  - `frontend/` - React frontend source code
  - Other project files

### 2. Frontend Production Build
- **Location**: `~/evimeria.breysomsolutions.co.ke/assets/`
- **Purpose**: Contains the built frontend files (dist folder contents)
- **Deployment**: Extract `frontend-dist.zip` contents here

## Deployment Process

### Step 1: Update Source Code
```bash
ssh -p 1980 royalce1@breysomsolutions.co.ke
cd ~/laravel-app/evimeria
git pull origin master
```

### Step 2: Clean Up Unnecessary Files
```bash
cd ~/laravel-app/evimeria
# Remove .md files, Android folders, start/stop service scripts
rm -f *.md start-services.* stop-services.* deploy*.ps1 deploy*.sh
rm -rf evimeria_mobile evimeria_mobile_web
```

### Step 3: Build Frontend Locally
```bash
cd frontend
npm run build
cd ..
Compress-Archive -Path frontend\dist\* -DestinationPath frontend-dist.zip -Force
```

### Step 4: Upload and Deploy Frontend
```bash
# Upload zip file
scp -P 1980 frontend-dist.zip royalce1@breysomsolutions.co.ke:~/tmp/

# SSH and extract
ssh -p 1980 royalce1@breysomsolutions.co.ke
cd ~/tmp
unzip -q -o frontend-dist.zip
cp index.html ~/evimeria.breysomsolutions.co.ke/assets/
if [ -d assets ]; then cp -r assets/* ~/evimeria.breysomsolutions.co.ke/assets/; fi
rm -rf assets index.html frontend-dist.zip
```

## Database Backup

### Backup Script Location
- **Script**: `~/backups/evimeria/database-backup.sh`
- **Backup Directory**: `~/backups/evimeria/`
- **Backup Format**: `evimeria_db_backup_YYYYMMDD_HHMMSS.sql.gz`

### Backup Schedule
- **Frequency**: Twice weekly
- **Days**: Monday and Thursday
- **Time**: 2:00 AM
- **Cron Job**: `0 2 * * 1,4 ~/backups/evimeria/database-backup.sh >> ~/backups/evimeria/backup.log 2>&1`

### Database Credentials
- **Host**: localhost
- **Port**: 3306
- **Database**: royalce1_evimeria
- **Username**: royalce1_portaladmin
- **Password**: (stored in backup script)

### Manual Backup
```bash
ssh -p 1980 royalce1@breysomsolutions.co.ke
~/backups/evimeria/database-backup.sh
```

### View Backup Log
```bash
ssh -p 1980 royalce1@breysomsolutions.co.ke
cat ~/backups/evimeria/backup.log
```

### List Backups
```bash
ssh -p 1980 royalce1@breysomsolutions.co.ke
ls -lh ~/backups/evimeria/evimeria_db_backup_*.sql.gz
```

## Important Notes

1. **Do NOT delete files outside** `laravel-app/evimeria/` and `evimeria.breysomsolutions.co.ke/` directories
2. The server hosts multiple domains and projects
3. Backups are automatically cleaned - only the last 10 backups are kept
4. Always test the backup script after deployment changes
5. The frontend zip file uses Windows path separators - handle extraction carefully

## Quick Deployment Command Sequence

```bash
# 1. Build and zip frontend locally
cd frontend && npm run build && cd .. && Compress-Archive -Path frontend\dist\* -DestinationPath frontend-dist.zip -Force

# 2. Update production code
ssh -p 1980 royalce1@breysomsolutions.co.ke "cd ~/laravel-app/evimeria && git pull origin master"

# 3. Upload and deploy frontend
scp -P 1980 frontend-dist.zip royalce1@breysomsolutions.co.ke:~/tmp/
ssh -p 1980 royalce1@breysomsolutions.co.ke "cd ~/tmp && unzip -q -o frontend-dist.zip && cp index.html ~/evimeria.breysomsolutions.co.ke/assets/ && [ -d assets ] && cp -r assets/* ~/evimeria.breysomsolutions.co.ke/assets/ || true && rm -rf assets index.html frontend-dist.zip"
```

