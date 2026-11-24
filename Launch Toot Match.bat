@echo off
cd /d "%~dp0"
node -e "const r=require('http').get('http://127.0.0.1:3000/__health',s=>process.exit(s.statusCode===200?0:1));r.on('error',()=>process.exit(1));r.setTimeout(500,()=>{r.destroy();process.exit(1);});" >nul 2>&1
if errorlevel 1 (
  echo Starting Toot Match server in the background...
  start "Toot Match Server" /min cmd /c "node server.js"
  timeout /t 1 /nobreak >nul
)
start "" "http://localhost:3000/labs/"
