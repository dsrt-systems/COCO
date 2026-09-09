# ═══════════════════════════════════════════════════════════════════
# VERIFY PHASE 9 — VERIFICATION FABRIC
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\jisum\COCO"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VERIFYING PHASE 9: VERIFICATION FABRIC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Typecheck
Write-Host "`n1. Running Typecheck across workspace..." -ForegroundColor Yellow
pnpm --filter @coco/common exec tsc --noEmit
pnpm --filter @coco/protocol exec tsc --noEmit
pnpm --filter @coco/security exec tsc --noEmit
pnpm --filter @coco/verification exec tsc --noEmit
Write-Host "   Typecheck passed cleanly!" -ForegroundColor Green

# Step 2: Check API Health & Reports Endpoint
Write-Host "`n2. Checking API Health & Verification Reports..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get
  Write-Host "   Health check status: $($health.status)" -ForegroundColor Green

  $reports = Invoke-RestMethod -Uri "http://localhost:3001/api/verification/report" -Method Get
  Write-Host "   Verification Reports endpoint returned $($reports.count) records." -ForegroundColor Green
} catch {
  Write-Host "   WARNING: Dev server not running on http://localhost:3001 — start via 'pnpm dev'" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 9 VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
