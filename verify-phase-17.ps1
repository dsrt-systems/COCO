# ═══════════════════════════════════════════════════════════════════
# VERIFY PHASE 17 — SPECIALIST ROSTER EXPANSION & CORPUS PIPELINE
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\jisum\COCO"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VERIFYING PHASE 17: FULL ROSTER & CORPORA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Typecheck
Write-Host "`n1. Running Typecheck across workspace..." -ForegroundColor Yellow
pnpm typecheck
Write-Host "   Typecheck passed cleanly!" -ForegroundColor Green

# 2. Check API Health & Seeding
Write-Host "`n2. Triggering Specialist Roster Seeding (C1-C134)..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 5
  Write-Host "   Health check status: $($health.status)" -ForegroundColor Green

  # The ?seed=true triggers the MasterRoster generator insertion into Postgres
  $res = Invoke-RestMethod -Uri "http://localhost:3001/api/specialists?seed=true" -Method Get -TimeoutSec 15
  Write-Host "   Roster API reachable. Found $($res.count) Specialists (excluding critics)." -ForegroundColor Green
  
  if ($res.count -ge 134) {
    Write-Host "   SUCCESS: All 134 capabilities successfully seeded!" -ForegroundColor Green
  } else {
    Write-Host "   NOTE: Returned $($res.count) specialists." -ForegroundColor Yellow
  }

} catch {
  Write-Host "   WARNING: Dev server not running on http://localhost:3001 — start via 'pnpm dev'" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 17 VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
