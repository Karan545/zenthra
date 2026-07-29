# Deploy ZenthraCurator to Arc Testnet (Windows PowerShell)
# Usage:
#   1. Copy .env.example -> .env and set PRIVATE_KEY (when ready)
#   2. .\scripts\deploy-arc-testnet.ps1
#   3. Optional dry-run (no broadcast): .\scripts\deploy-arc-testnet.ps1 -DryRun

param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$foundryBin = Join-Path $env:USERPROFILE ".foundry\bin"
$env:Path = "$foundryBin;C:\Program Files\Git\cmd;C:\Program Files\Git\bin;" + $env:Path

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host ""
Write-Host "=== Deploy ZenthraCurator -> Arc Testnet ===" -ForegroundColor Cyan
Write-Host "RPC: https://rpc.testnet.arc.network  |  chainId: 5042002"
Write-Host ""

# Load .env if present
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $parts = $line -split "=", 2
    if ($parts.Length -eq 2) {
      $key = $parts[0].Trim()
      $val = $parts[1].Trim().Trim('"').Trim("'")
      [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
  }
  Write-Host "[OK] Loaded .env" -ForegroundColor Green
} else {
  Write-Host "[!!] No .env file found (copy .env.example to .env)" -ForegroundColor Yellow
}

if (-not $DryRun) {
  if (-not $env:PRIVATE_KEY -or $env:PRIVATE_KEY.Length -lt 10) {
    Write-Host ""
    Write-Host "PRIVATE_KEY is missing." -ForegroundColor Red
    Write-Host "1. Copy .env.example to .env"
    Write-Host "2. Paste your testnet deployer private key into PRIVATE_KEY="
    Write-Host "3. Fund that wallet with Arc Testnet USDC (faucet)"
    Write-Host "4. Re-run this script"
    Write-Host ""
    Write-Host "Tip: use a FRESH wallet with only testnet funds — never a main wallet."
    exit 1
  }
}

# Safety: show who will deploy without printing the key
if ($env:PRIVATE_KEY) {
  try {
    $addr = cast wallet address --private-key $env:PRIVATE_KEY
    Write-Host "Deployer address: $addr" -ForegroundColor Green
    Write-Host "Check balance on https://testnet.arcscan.app/address/$addr"
  } catch {
    Write-Host "Could not derive address from PRIVATE_KEY — check the key format (0x...)." -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
if ($DryRun) {
  Write-Host "DRY RUN (simulation only — no broadcast)..." -ForegroundColor Yellow
  forge script script/DeployZenthraCurator.s.sol:DeployZenthraCurator `
    --rpc-url https://rpc.testnet.arc.network `
    -vvvv
} else {
  Write-Host "Broadcasting deployment..." -ForegroundColor Yellow
  forge script script/DeployZenthraCurator.s.sol:DeployZenthraCurator `
    --rpc-url https://rpc.testnet.arc.network `
    --broadcast `
    --private-key $env:PRIVATE_KEY `
    -vvvv
}

if ($LASTEXITCODE -ne 0) {
  Write-Host "Deploy failed (exit $LASTEXITCODE)." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "If SUCCESS, copy the printed ZenthraCurator address." -ForegroundColor Green
Write-Host "View txs under contracts/broadcast/ after a real deploy."
Write-Host ""
