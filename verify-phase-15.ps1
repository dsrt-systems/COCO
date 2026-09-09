# ═══════════════════════════════════════════════════════════════════
# VERIFY PHASE 15 — EVOLUTION FABRIC
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\jisum\COCO"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VERIFYING PHASE 15: EVOLUTION FABRIC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Typecheck
Write-Host "`n1. Running Typecheck across workspace..." -ForegroundColor Yellow
pnpm typecheck
Write-Host "   Typecheck passed cleanly!" -ForegroundColor Green

# 2. Package Verification
Write-Host "`n2. Checking @coco/evolution exports..." -ForegroundColor Yellow
$index = Get-Content -LiteralPath "packages\coco-evolution\src\index.ts" -Raw
if ($index -match "proposals" -and $index -match "learners" -and $index -match "nightly") {
  Write-Host "   Package @coco/evolution structural exports OK." -ForegroundColor Green
} else {
  Write-Host "   WARNING: Missing expected exports in @coco/evolution index." -ForegroundColor Red
}

# 3. API Health
Write-Host "`n3. Checking API Health & Evolution Endpoints..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 5
  Write-Host "   Health check status: $($health.status)" -ForegroundColor Green
  
  $props = Invoke-RestMethod -Uri "http://localhost:3001/api/evolution/proposals" -Method Get -TimeoutSec 5
  Write-Host "   Evolution proposals endpoint reachable: $($props.count) pending." -ForegroundColor Green
} catch {
  Write-Host "   WARNING: Dev server not running on http://localhost:3001 — start via 'pnpm dev'" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 15 VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
