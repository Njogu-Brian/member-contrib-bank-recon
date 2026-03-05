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

### Laravel Scheduler (Invoice Auto-Generation)
Weekly and scheduled invoices only run if the Laravel scheduler is triggered every minute. Add this to the production server crontab:

```bash
* * * * * cd ~/laravel-app/evimeria/backend && php artisan schedule:run >> /dev/null 2>&1
```

**What it runs:**
- **Weekly invoices**: Every Monday at 00:00 (`invoices:generate-weekly`)
- **Scheduled invoices** (yearly, monthly, etc.): Daily at 01:00 (`invoices:generate-scheduled`)
- **Invoice reminders**: Daily at time set in Settings (`invoices:send-reminders`)
- **Scheduled reports**: Hourly check

**To add the cron on production:**
```bash
ssh -p 1980 royalce1@breysomsolutions.co.ke
crontab -e
# Add the line above (adjust path if backend is not in ~/laravel-app/evimeria/backend)
```

**To backfill missing weekly invoices** (e.g. from 2 Feb to today):
```bash
cd ~/laravel-app/evimeria/backend
# Preview what would be created (dry run)
php artisan invoices:backfill --from=2025-02-02 --to=2025-03-05 --dry-run
# Run for real
php artisan invoices:backfill --from=2025-02-02 --to=2025-03-05
```
Replace dates with your desired range. Existing invoices for a week are skipped.

### Queue worker (statement parsing)
Bank statement parsing runs in the Laravel queue (`ProcessBankStatement` job). If the queue worker is not running, uploaded statements will not be parsed until you start it manually. Many shared hosting servers do **not** have `systemctl` (systemd); use the cron method below.

**Option A: cron @reboot (use this when `systemctl` is not available)**  
Add to crontab so the queue worker starts after every reboot:

```bash
crontab -e
```

Add this line (replace `royalce1` with your username if your home path is different):

```bash
@reboot sleep 30 && cd ~/laravel-app/evimeria/backend && nohup php artisan queue:work --sleep=3 --tries=3 >> storage/logs/queue-worker.log 2>&1 &
```

Or use the startup script (after `git pull` so the script exists):

```bash
@reboot sleep 30 && bash ~/laravel-app/evimeria/backend/deploy/start-queue-worker.sh
```

**Start the worker now (without rebooting):**

```bash
cd ~/laravel-app/evimeria/backend
nohup php artisan queue:work --sleep=3 --tries=3 >> storage/logs/queue-worker.log 2>&1 &
```

Or run the script:

```bash
cd ~/laravel-app/evimeria
bash backend/deploy/start-queue-worker.sh
```

**Useful commands:**
- Check if worker is running: `pgrep -f "artisan.*queue:work"`
- View logs: `tail -f ~/laravel-app/evimeria/backend/storage/logs/queue-worker.log`
- Stop worker: `pkill -f "artisan queue:work"` (then start again with the commands above)

**Option B: systemd user service (only if your server has `systemctl`)**  
If you have systemd, you can use the service file instead for auto-restart on failure:

```bash
mkdir -p ~/.config/systemd/user
cp backend/deploy/evimeria-queue.service ~/.config/systemd/user/
nano ~/.config/systemd/user/evimeria-queue.service   # set WorkingDirectory and Environment=HOME to your $HOME path
systemctl --user daemon-reload
systemctl --user enable evimeria-queue
systemctl --user start evimeria-queue
```

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

