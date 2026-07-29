# Verifies Foundry + deps for Zenthra contracts (Windows)
$ErrorActionPreference = "Stop"

$foundryBin = Join-Path $env:USERPROFILE ".foundry\bin"
$env:Path = "$foundryBin;C:\Program Files\Git\cmd;C:\Program Files\Git\bin;" + $env:Path

Write-Host ""
Write-Host "=== Zenthra contracts setup check ===" -ForegroundColor Cyan
Write-Host ""

function Ok($msg) { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Bad($msg) { Write-Host "  [!!]  $msg" -ForegroundColor Red }
function Info($msg) { Write-Host "  [--]  $msg" -ForegroundColor Yellow }

# Git
try {
  $gv = git --version
  Ok "Git: $gv"
} catch {
  Bad "Git not found. Install from https://git-scm.com/download/win"
}

# Forge
try {
  $fv = forge --version | Select-Object -First 1
  Ok "Forge: $fv"
} catch {
  Bad "Forge not found. Expected at $foundryBin\forge.exe"
  Info "Re-download Foundry or add $foundryBin to your PATH."
}

# Cast
try {
  $null = cast --version
  Ok "Cast available"
} catch {
  Bad "Cast not found"
}

# Libs
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (Test-Path "lib\openzeppelin-contracts\contracts\access\Ownable.sol") {
  Ok "OpenZeppelin contracts installed"
} else {
  Bad "OpenZeppelin missing — run: forge install OpenZeppelin/openzeppelin-contracts@v5.2.0"
}

if ((Test-Path "lib\forge-std\src\Script.sol") -or (Test-Path "lib\forge-std\Script.sol")) {
  Ok "forge-std installed"
} else {
  Bad "forge-std missing - run: forge install foundry-rs/forge-std"
}

Write-Host ""
Write-Host "Running forge test..." -ForegroundColor Cyan
forge test -q
if ($LASTEXITCODE -eq 0) {
  Ok "All tests passed"
} else {
  Bad "Tests failed (exit $LASTEXITCODE)"
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "When ready to deploy, read DEPLOY.md (do not put private keys in chat)."
Write-Host ""
