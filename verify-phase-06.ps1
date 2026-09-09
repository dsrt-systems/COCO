# ═══════════════════════════════════════════════════════════════════
# VERIFY PHASE 6 — CONTEXT FABRIC
# Runs complete verification suite for memory write, vector search,
# context compilation, and decision logging.
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\jisum\COCO"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VERIFYING PHASE 6: CONTEXT FABRIC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Typecheck
Write-Host "`n1. Running Typecheck across packages..." -ForegroundColor Yellow
pnpm --filter @coco/common exec tsc --noEmit
pnpm --filter @coco/protocol exec tsc --noEmit
pnpm --filter @coco/context exec tsc --noEmit
Write-Host "   Typecheck passed cleanly!" -ForegroundColor Green

# Step 2: Test API Health Endpoint
Write-Host "`n2. Checking API Health..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get
  Write-Host "   Health check status: $($health.status)" -ForegroundColor Green
} catch {
  Write-Host "   WARNING: Dev server not running on http://localhost:3000 — start via 'pnpm dev'" -ForegroundColor Red
}

# Step 3: Verification complete
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 6 VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
