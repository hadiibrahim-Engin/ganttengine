@echo off
title Grid Outage Planner
cd /d "%~dp0"

echo.
echo  =============================================
echo   Grid Outage Planner
echo  =============================================
echo.

:: ── Check Node.js ────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 goto :no_node

:: Use Node itself to check version (avoids locale-specific parsing bugs)
node -e "var v=parseInt(process.version.slice(1));if(v<18){process.stderr.write('Node '+process.version+' too old\n');process.exit(1);}" 2>nul
if %errorlevel% neq 0 (
  echo  [ERROR] Node.js v18 or newer is required.
  echo  Download: https://nodejs.org
  echo.
  pause & exit /b 1
)

for /f "delims=" %%v in ('node -e "process.stdout.write(process.version)"') do set NODEVER=%%v
echo  Node.js %NODEVER% found.

:: ── If dist is ready, skip all build steps ───────────────────
if exist "dist\index.html" (
  echo  Pre-built app found.
  goto :serve
)

:: ── Install ───────────────────────────────────────────────────
if not exist "node_modules\webpack\bin\webpack.js" (
  echo  Installing dependencies (pure JS, no native binaries^)...
  call npm install
  if %errorlevel% neq 0 (
    echo  [ERROR] npm install failed.
    pause & exit /b 1
  )
  echo  Done.
  echo.
)

:: ── Build ─────────────────────────────────────────────────────
echo  Building...
call npm run build
if %errorlevel% neq 0 (
  echo  [ERROR] Build failed.
  pause & exit /b 1
)
echo  Done.
echo.

:serve
echo  Starting on http://localhost:5173
echo  Press Ctrl+C to stop.
echo.
start "" http://localhost:5173
node serve.cjs
goto :end

:: ── No Node: try Python ───────────────────────────────────────
:no_node
echo  Node.js not found.
if not exist "dist\index.html" (
  echo  [ERROR] No pre-built app found. Install Node.js v18+: https://nodejs.org
  pause & exit /b 1
)
where python >nul 2>&1
if %errorlevel% equ 0 (
  echo  Serving via Python on http://localhost:8080
  start "" http://localhost:8080
  python -m http.server 8080 --directory dist
  goto :end
)
where py >nul 2>&1
if %errorlevel% equ 0 (
  echo  Serving via Python on http://localhost:8080
  start "" http://localhost:8080
  py -m http.server 8080 --directory dist
  goto :end
)
echo  [ERROR] Neither Node.js nor Python found.
echo  Install Node.js v18+: https://nodejs.org
pause

:end
