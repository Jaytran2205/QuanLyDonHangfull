$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[QuanLyDonHang] $Message" -ForegroundColor Cyan
}

function Ensure-Administrator {
  $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
  $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

  if ($isAdmin) {
    return
  }

  Write-Host "Yeu cau quyen Admin. Dang mo lai voi quyen quan tri..." -ForegroundColor Yellow
  $scriptPath = $MyInvocation.MyCommand.Path
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -Verb RunAs
  exit 0
}

function Get-LatestFile {
  param(
    [string[]]$Patterns
  )

  foreach ($pattern in $Patterns) {
    $match = Get-ChildItem -Path (Join-Path $PSScriptRoot $pattern) -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1

    if ($match) {
      return $match
    }
  }

  return $null
}

function Ensure-MongoDb {
  $service = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
  if (-not $service) {
    $msi = Get-LatestFile -Patterns @("mongodb*.msi", "*mongo*.msi")
    if (-not $msi) {
      throw "Khong tim thay file cai MongoDB (*.msi) trong cung thu muc deploy."
    }

    Write-Step "Dang cai MongoDB: $($msi.Name)"
    $arguments = @(
      "/i",
      "`"$($msi.FullName)`"",
      "/qn",
      "/norestart",
      "ADDLOCAL=ServerService"
    )

    $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $arguments -Wait -PassThru
    if ($process.ExitCode -ne 0) {
      throw "Cai MongoDB that bai (ExitCode=$($process.ExitCode))."
    }

    $service = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
  }

  if (-not $service) {
    throw "Khong tim thay Windows Service MongoDB sau khi cai dat."
  }

  Set-Service -Name "MongoDB" -StartupType Automatic -ErrorAction SilentlyContinue

  if ($service.Status -ne "Running") {
    Write-Step "Dang khoi dong MongoDB service"
    Start-Service -Name "MongoDB"
  }

  Write-Step "Dang doi MongoDB san sang tren cong 27017"
  $deadline = (Get-Date).AddSeconds(45)
  do {
    try {
      $tcp = New-Object System.Net.Sockets.TcpClient
      $async = $tcp.BeginConnect("127.0.0.1", 27017, $null, $null)
      $waitOk = $async.AsyncWaitHandle.WaitOne(1000)
      if ($waitOk -and $tcp.Connected) {
        $tcp.EndConnect($async)
        $tcp.Close()
        return
      }
      $tcp.Close()
    } catch {
      # retry
    }

    Start-Sleep -Milliseconds 700
  } while ((Get-Date) -lt $deadline)

  throw "MongoDB khong san sang sau 45 giay."
}

function Install-Or-UpdateApp {
  $appInstaller = Get-LatestFile -Patterns @("QuanLyDonHang Setup *.exe", "*QuanLyDonHang*Setup*.exe")
  if (-not $appInstaller) {
    throw "Khong tim thay bo cai app (QuanLyDonHang Setup *.exe) trong thu muc deploy."
  }

  Write-Step "Dang cai/cap nhat app: $($appInstaller.Name)"
  $proc = Start-Process -FilePath $appInstaller.FullName -Wait -PassThru
  if ($proc.ExitCode -ne 0) {
    throw "Cai app that bai (ExitCode=$($proc.ExitCode))."
  }
}

function Launch-App {
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\QuanLyDonHang\QuanLyDonHang.exe",
    "$env:ProgramFiles\QuanLyDonHang\QuanLyDonHang.exe",
    "$env:ProgramFiles(x86)\QuanLyDonHang\QuanLyDonHang.exe"
  )

  $exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($exe) {
    Write-Step "Mo ung dung"
    Start-Process -FilePath $exe
    return
  }

  Write-Host "Da cai xong. Neu app chua tu mo, vui long mo QuanLyDonHang tu Start Menu." -ForegroundColor Yellow
}

try {
  Ensure-Administrator
  Write-Step "Bat dau cai dat nhanh"
  Ensure-MongoDb
  Install-Or-UpdateApp
  Launch-App
  Write-Host "HOAN TAT: Da cai dat xong va san sang su dung." -ForegroundColor Green
} catch {
  Write-Host "LOI: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
