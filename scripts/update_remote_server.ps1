# PowerShell script to update remote server repository via SSH
# This discards local cache changes and forces a pull from remote

# Configuration - Update these with your server details
$ServerUser = "your_username"  # Replace with your cPanel username
$ServerHost = "rs2.noc254.com"  # Or your server IP
$RepoPath = "/home2/royalce1/laravel-app/evimeria"
$RemoteBranch = "master"

Write-Host "Connecting to server and updating repository..." -ForegroundColor Cyan
Write-Host ""

# Create SSH command
$sshCommand = @"
cd $RepoPath
echo 'Current directory: '`$(pwd)
echo ''

# Show current status
echo '=== Current Git Status ==='
git status --short
echo ''

# Discard all local changes (cache files, logs, etc.)
echo '=== Discarding local changes ==='
git reset --hard HEAD
git clean -fd

# Ensure we're on the correct branch
echo ''
echo '=== Checking out $RemoteBranch branch ==='
git checkout $RemoteBranch

# Force fetch and reset to match remote
echo ''
echo '=== Fetching latest changes from remote ==='
git fetch origin $RemoteBranch

# Reset to match remote exactly
echo ''
echo '=== Resetting to match remote repository ==='
git reset --hard origin/$RemoteBranch

# Show final status
echo ''
echo '=== Final Status ==='
git status
echo ''
echo '=== Latest Commit ==='
git log -1 --oneline
echo ''
echo 'Repository update complete!'
"@

# Execute SSH command
ssh "${ServerUser}@${ServerHost}" $sshCommand

Write-Host ""
Write-Host "Remote server update script completed!" -ForegroundColor Green

