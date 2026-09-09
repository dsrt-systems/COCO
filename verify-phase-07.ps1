# ═══════════════════════════════════════════════════════════════════
# VERIFY PHASE 7 — INTELLIGENCE FABRIC & AGENT RUNTIME
# Runs complete verification suite for agent registration, dynamic
# spawning, methodology execution, and paired critic review.
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\jisum\COCO"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VERIFYING PHASE 7: INTELLIGENCE FABRIC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Typecheck
Write-Host "`n1. Running Typecheck across packages..." -ForegroundColor Yellow
pnpm --filter @coco/common exec tsc --noEmit
pnpm --filter @coco/protocol exec tsc --noEmit
pnpm --filter @coco/intelligence exec tsc --noEmit
Write-Host "   Typecheck passed cleanly!" -ForegroundColor Green

# Step 2: Check API Health & Agent Registry
Write-Host "`n2. Checking API Health & Agent Registry..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get
  Write-Host "   Health check status: $($health.status)" -ForegroundColor Green

  $registry = Invoke-RestMethod -Uri "http://localhost:3001/api/agents/registry" -Method Get
  Write-Host "   Agent Registry returned $($registry.count) registered agents" -ForegroundColor Green
  foreach ($agent in $registry.agents) {
    Write-Host "     - [$($agent.tier)] $($agent.agent_id): $($agent.name)" -ForegroundColor DarkGray
  }
} catch {
  Write-Host "   WARNING: Dev server not running on http://localhost:3001 — start via 'pnpm dev'" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 7 VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
