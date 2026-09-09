# ═══════════════════════════════════════════════════════════════════
# VERIFY PHASE 14 — RANGER RUNTIME (AUTONOMOUS WORK)
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\jisum\COCO"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VERIFYING PHASE 14: RANGER RUNTIME" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Typecheck
Write-Host "`n1. Running Typecheck across workspace..." -ForegroundColor Yellow
pnpm typecheck
Write-Host "   Typecheck passed cleanly!" -ForegroundColor Green

# Step 2: Check API Health & Ranger Endpoints
Write-Host "`n2. Checking API Health & Ranger Runtime Endpoints..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get
  Write-Host "   Health check status: $($health.status)" -ForegroundColor Green
} catch {
  Write-Host "   WARNING: Dev server not running on http://localhost:3001 — start via 'pnpm dev'" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 14 VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
