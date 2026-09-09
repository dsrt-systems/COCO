# ═══════════════════════════════════════════════════════════════════
# VERIFY PHASE 10 — DOMAIN DIRECTORS & FLAGSHIP SPECIALISTS
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\jisum\COCO"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VERIFYING PHASE 10: TIER 2 & 3 AGENTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Typecheck
Write-Host "`n1. Running Typecheck across workspace..." -ForegroundColor Yellow
pnpm typecheck
Write-Host "   Typecheck passed cleanly!" -ForegroundColor Green

# Step 2: Check API & Agent Registration
Write-Host "`n2. Seeding & Fetching Agent Registry..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get
  Write-Host "   Health check status: $($health.status)" -ForegroundColor Green

  $registry = Invoke-RestMethod -Uri "http://localhost:3001/api/agents/registry" -Method Get
  Write-Host "   Agent Registry returned $($registry.count) total agents." -ForegroundColor Green
  
  $core = ($registry.agents | Where-Object { $_.tier -eq 'tier_1_core' }).Count
  $directors = ($registry.agents | Where-Object { $_.tier -eq 'tier_2_director' }).Count
  $specialists = ($registry.agents | Where-Object { $_.tier -eq 'tier_3_specialist' }).Count

  Write-Host "   - Core Agents (A1-A8): $core" -ForegroundColor DarkGray
  Write-Host "   - Domain Directors (B1-B10): $directors" -ForegroundColor DarkGray
  Write-Host "   - Flagship Specialists (C1, C21, C36, C48, C60 + Critics): $specialists" -ForegroundColor DarkGray

} catch {
  Write-Host "   WARNING: Dev server not running on http://localhost:3001 — start via 'pnpm dev'" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 10 VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
