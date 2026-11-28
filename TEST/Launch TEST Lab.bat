@echo off
cd /d "%~dp0.."
node -e "const http=require('http');http.get('http://127.0.0.1:3000/api/test/recordings',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{if(res.statusCode===200&&d.includes('files'))process.exit(0);process.exit(2);});}).on('error',()=>process.exit(1));" >nul 2>&1
if errorlevel 2 (
  echo Note: Port 3000 is running an older server without /api/test/recordings.
  echo Close the existing server window and re-run Launch TEST Lab.bat when you want Disk WAV saving.
  echo Opening TEST Lab with all 48 embedded pre-recorded farts enabled...
  goto open_url
)
if errorlevel 1 (
  echo Starting Toot Match Labs server in the background...
  start "Toot Match Server" /min cmd /c "node server.js"
  timeout /t 1 /nobreak >nul
)
:open_url
start "" "http://localhost:3000/TEST/?v=20261127t10"
