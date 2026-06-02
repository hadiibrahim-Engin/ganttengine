$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot

$AppName = "Grid Outage Planner"
$MinNodeMajor = 18

function Write-Info {
  param([string]$Message)
  Write-Host $Message
}

function Exit-WithError {
  param([string]$Message)
  Write-Error "[ERROR] $Message"
  exit 1
}

Write-Info ""
Write-Info "============================================="
Write-Info " * $AppName build"
Write-Info "============================================="
Write-Info ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Exit-WithError "Node.js v$MinNodeMajor or newer is required."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Exit-WithError "npm is required."
}

$NodeMajor = [int](& node -e "process.stdout.write(String(parseInt(process.versions.node.split('.')[0], 10)))")
if ($NodeMajor -lt $MinNodeMajor) {
  Exit-WithError "Node.js v$MinNodeMajor or newer is required. Found $(& node -v)."
}

Write-Info "Node $(& node -v) found."
Write-Info "npm $(& npm -v) found."
Write-Info ""

if (Test-Path -Path "package-lock.json") {
  Write-Info "Installing dependencies with npm ci..."
  & npm ci
} else {
  Write-Info "Installing dependencies with npm install..."
  & npm install
}

if ($LASTEXITCODE -ne 0) {
  Exit-WithError "Dependency installation failed."
}

Write-Info ""
Write-Info "Building production bundle..."
& npm run build

if ($LASTEXITCODE -ne 0) {
  Exit-WithError "Build failed."
}

if (-not (Test-Path -Path "dist/index.html")) {
  Exit-WithError "Build completed, but dist/index.html was not created."
}

Write-Info ""
Write-Info "Build complete: $(Join-Path (Get-Location) 'dist')"
