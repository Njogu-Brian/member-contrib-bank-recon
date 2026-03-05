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
Bank statement parsing runs in the Laravel queue (`ProcessBankStatement` job). If the queue worker is not running, uploaded statements will not be parsed until you start it manually. To have it start automatically on boot and restart on failure, use a systemd user service.

**Option A: systemd user service (recommended)**

1. On the production server, create the user systemd directory and copy the service file (after pulling the repo so `backend/deploy/` exists):
   ```bash
   ssh -p 1980 royalce1@breysomsolutions.co.ke
   cd ~/laravel-app/evimeria
   git pull origin master   # or your branch
   mkdir -p ~/.config/systemd/user
   cp backend/deploy/evimeria-queue.service ~/.config/systemd/user/
   ```

2. Edit the service file and set the correct paths. Replace `/home/royalce1` with your actual home path if different (run `echo $HOME` to check). Update `WorkingDirectory` and `Environment=HOME` to that path. If PHP is not at `/usr/bin/php`, run `which php` and update `ExecStart`:
   ```bash
   nano ~/.config/systemd/user/evimeria-queue.service
   ```

3. Enable and start the service:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable evimeria-queue
   systemctl --user start evimeria-queue
   ```

4. (Optional) Enable lingering so the queue worker keeps running after you log out:
   ```bash
   loginctl enable-linger $USER
   ```

**Useful commands:**
- Check status: `systemctl --user status evimeria-queue`
- Restart: `systemctl --user restart evimeria-queue`
- View logs: `journalctl --user -u evimeria-queue -f`

**Option B: cron @reboot (if systemd user is not available)**  
Add to crontab (`crontab -e`):
```bash
@reboot sleep 30 && cd ~/laravel-app/evimeria/backend && nohup php artisan queue:work --sleep=3 --tries=3 >> storage/logs/queue-worker.log 2>&1 &
```
This starts the worker after each reboot but does not restart it if it crashes.

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

