param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFolder,
  [string]$MongoUri = "mongodb://127.0.0.1:27017",
  [string]$DatabaseName = "order_internal_db",
  [string]$UploadsDir = "",
  [switch]$Drop
)

$ErrorActionPreference = "Stop"

$restoreCommand = Get-Command mongorestore -ErrorAction SilentlyContinue
if (-not $restoreCommand) {
  throw "Khong tim thay mongorestore. Hay cai MongoDB Database Tools va them vao PATH."
}

$dbDumpPath = Join-Path (Join-Path $BackupFolder "db") $DatabaseName
if (-not (Test-Path $dbDumpPath)) {
  throw "Khong tim thay thu muc dump CSDL: $dbDumpPath"
}

$restoreArgs = @(
  "--uri=$MongoUri",
  "--db=$DatabaseName"
)

if ($Drop) {
  $restoreArgs += "--drop"
}

$restoreArgs += $dbDumpPath

& mongorestore @restoreArgs

if (-not $UploadsDir) {
  $UploadsDir = Join-Path $env:APPDATA "QuanLyDonHang\uploads"
}

$uploadsBackup = Join-Path $BackupFolder "uploads"
if (Test-Path $uploadsBackup) {
  New-Item -ItemType Directory -Path $UploadsDir -Force | Out-Null
  Copy-Item -Path (Join-Path $uploadsBackup "*") -Destination $UploadsDir -Recurse -Force
}

Write-Output "RESTORE_OK"
