$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot

$AppName = "Grid Outage Planner"
$MinNodeMajor = 18
$Port = if ($env:PORT) { $env:PORT } else { "5173" }

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
Write-Info " * $AppName start"
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

if (-not (Test-Path -Path "dist/index.html")) {
  Write-Info "No production build found. Building first..."
  & (Join-Path $PSScriptRoot "build.ps1")
  if ($LASTEXITCODE -ne 0) {
    Exit-WithError "Build failed."
  }
  Write-Info ""
}

Write-Info "Starting $AppName at http://localhost:$Port"
Write-Info "Press Ctrl+C to stop."
Write-Info ""

$env:PORT = $Port
& npm run preview

if ($LASTEXITCODE -ne 0) {
  Exit-WithError "Preview server failed."
}
