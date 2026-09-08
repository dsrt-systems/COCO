$ErrorActionPreference = 'Continue'
$missing = 0
$found = 0
$corrupt = 0

function Verify-File {
    param([string]$path)
    if (Test-Path $path -PathType Leaf) {
        $content = Get-Content $path -Raw
        # Check for escaped sequence artifacts caused by PowerShell double quote expansion
        if ($content -match '\\\\[a-zA-Z\\_]+' -or $content -match '\\\\[a-zA-Z]+' -or $content -match '\\\{' -or $content -match '\\\}') {
            Write-Host "  [CORRUPT]  $path" -ForegroundColor Red
            $script:corrupt++
        } else {
            $size = (Get-Item $path).Length
            Write-Host "  [  OK  ]  $path  ($size bytes)" -ForegroundColor Green
            $script:found++
        }
    } else {
        Write-Host "  [MISSING] $path" -ForegroundColor Yellow
        $script:missing++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  COCO WORKSPACE INTEGRITY CHECK" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

Verify-File "packages/coco-common/src/ids.ts"
Verify-File "packages/coco-common/src/time.ts"
Verify-File "packages/coco-config/src/constitution.ts"
Verify-File "packages/coco-protocol/src/event.ts"
Verify-File "packages/coco-protocol/src/model.ts"
Verify-File "apps/web/src/app/(app)/dashboard/page.tsx"
Verify-File "apps/web/src/app/(app)/constitution/page.tsx"
Verify-File "apps/web/src/app/(auth)/callback/route.ts"
Verify-File "apps/web/src/app/(auth)/sign-in/page.tsx"
Verify-File "apps/web/src/app/(auth)/sign-up/page.tsx"
Verify-File "apps/web/src/app/layout.tsx"
Verify-File "apps/web/next.config.ts"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  RESULT" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  Clean / Valid: $found" -ForegroundColor Green
Write-Host "  Missing:       $missing" -ForegroundColor Yellow
Write-Host "  Corrupt:       $corrupt" -ForegroundColor $(if ($corrupt -eq 0) { 'Green' } else { 'Red' })
Write-Host ""

if ($corrupt -eq 0 -and $missing -eq 0) {
    Write-Host "  ✅  WORKSPACE INTEGRITY IS PERFECT" -ForegroundColor Green
} else {
    Write-Host "  ❌  ERRORS DETECTED — CHECK AND RE-RUN REWRITE BLOCKS" -ForegroundColor Red
}
Write-Host ""
