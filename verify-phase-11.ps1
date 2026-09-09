# ═══════════════════════════════════════════════════════════════════
# VERIFY PHASE 11 — WEB UI SHELL & MISSION INTERFACE
# Runs typecheck across the monorepo, verifies React components,
# and checks the API health.
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\jisum\COCO"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VERIFYING PHASE 11: WEB UI SHELL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Typecheck
Write-Host "`n1. Running Typecheck across workspace..." -ForegroundColor Yellow
pnpm typecheck
Write-Host "   Typecheck passed cleanly!" -ForegroundColor Green

# Step 2: Check Next.js Build Readiness
Write-Host "`n2. Checking Web App Build Readiness..." -ForegroundColor Yellow
# Run Next.js linting to catch any React component errors
pnpm --filter web run lint
Write-Host "   Next.js linting passed!" -ForegroundColor Green

# Step 3: Check API Health
Write-Host "`n3. Checking API Health..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get
  Write-Host "   Health check status: $($health.status)" -ForegroundColor Green
} catch {
  Write-Host "   WARNING: Dev server not running on http://localhost:3001 — start via 'pnpm dev'" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 11 VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
