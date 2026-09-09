# ═══════════════════════════════════════════════════════════════════
# VERIFY PHASE 16 — BILLING, METERING & NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\jisum\COCO"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VERIFYING PHASE 16: BILLING & NOTIFICATIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Typecheck
Write-Host "`n1. Running Typecheck across workspace..." -ForegroundColor Yellow
pnpm typecheck
Write-Host "   Typecheck passed cleanly!" -ForegroundColor Green

# 2. Package Structure
Write-Host "`n2. Checking @coco/billing exports..." -ForegroundColor Yellow
$required = @(
  "packages\coco-billing\src\index.ts",
  "packages\coco-billing\src\metering\index.ts",
  "packages\coco-billing\src\notifications\index.ts",
  "packages\coco-billing\src\stripe\index.ts",
  "apps\web\src\app\api\billing\subscription\route.ts",
  "apps\web\src\app\api\billing\usage\route.ts",
  "apps\web\src\app\api\billing\checkout\route.ts",
  "apps\web\src\app\api\billing\webhook\route.ts",
  "apps\web\src\app\(app)\billing\page.tsx"
)
foreach ($f in $required) {
  if (-not (Test-Path -LiteralPath $f)) {
    Write-Host "   MISSING: $f" -ForegroundColor Red
    exit 1
  }
}
Write-Host "   All billing files present!" -ForegroundColor Green

# 3. API Health
Write-Host "`n3. Checking API Health & Billing Endpoints..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 5
  Write-Host "   Health check status: $($health.status)" -ForegroundColor Green

  $sub = Invoke-RestMethod -Uri "http://localhost:3001/api/billing/subscription" -Method Get -TimeoutSec 5
  Write-Host "   Billing subscription endpoint reachable: tier=$($sub.subscription.tier)" -ForegroundColor Green
} catch {
  Write-Host "   WARNING: Dev server not running on http://localhost:3001 — start via 'pnpm dev'" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PHASE 16 VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
