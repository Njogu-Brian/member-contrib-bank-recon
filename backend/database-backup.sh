#!/bin/bash
# Database backup script for Evimeria System
# This script creates a backup of the production database

# Database credentials
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="royalce1_evimeria"
DB_USER="royalce1_portaladmin"
DB_PASS="kVfY_y^%UJ-tG&4)MuhatiaWanguiMurathime/kqpuolnz,ty89w505680.,?>}|}|_+0-"

# Backup directory
BACKUP_DIR="$HOME/backups/evimeria"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/evimeria_db_backup_$DATE.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup successful: $BACKUP_FILE"
    
    # Keep only the last 10 backups (delete older ones)
    cd "$BACKUP_DIR"
    ls -t evimeria_db_backup_*.sql.gz | tail -n +11 | xargs -r rm -f
    
    echo "Old backups cleaned up. Keeping last 10 backups."
else
    echo "Backup failed!" >&2
    exit 1
fi

