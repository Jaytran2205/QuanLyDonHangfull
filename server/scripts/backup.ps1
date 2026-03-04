param(
  [string]$MongoUri = "mongodb://127.0.0.1:27017",
  [string]$DatabaseName = "order_internal_db",
  [string]$BackupRoot = "$env:PUBLIC\QuanLyDonHangBackups",
  [string]$UploadsDir = "",
  [switch]$Zip
)

$ErrorActionPreference = "Stop"

$dumpCommand = Get-Command mongodump -ErrorAction SilentlyContinue
if (-not $dumpCommand) {
  throw "Khong tim thay mongodump. Hay cai MongoDB Database Tools va them vao PATH."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFolder = Join-Path $BackupRoot $timestamp
$dbBackupParent = Join-Path $backupFolder "db"

New-Item -ItemType Directory -Path $dbBackupParent -Force | Out-Null

& mongodump --uri=$MongoUri --db=$DatabaseName --out=$dbBackupParent

if (-not $UploadsDir) {
  $UploadsDir = Join-Path $env:APPDATA "QuanLyDonHang\uploads"
}

if (Test-Path $UploadsDir) {
  $uploadsBackup = Join-Path $backupFolder "uploads"
  New-Item -ItemType Directory -Path $uploadsBackup -Force | Out-Null
  Copy-Item -Path (Join-Path $UploadsDir "*") -Destination $uploadsBackup -Recurse -Force
}

if ($Zip) {
  $zipPath = "$backupFolder.zip"
  if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
  }
  Compress-Archive -Path (Join-Path $backupFolder "*") -DestinationPath $zipPath
  Write-Output "BACKUP_OK_ZIP=$zipPath"
} else {
  Write-Output "BACKUP_OK_DIR=$backupFolder"
}
