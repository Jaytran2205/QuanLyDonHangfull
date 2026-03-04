@echo off
setlocal
cd /d "%~dp0"
echo Dang chay trinh cai dat nhanh QuanLyDonHang...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CaiNhanh.ps1"
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Cai dat that bai. Vui long chup man hinh loi gui cho ky thuat.
  pause
)
endlocal
