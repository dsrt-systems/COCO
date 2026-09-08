$ErrorActionPreference = 'Continue'
$missing = 0
$found = 0

function Check-File {
    param([string]$path)
    if (Test-Path $path -PathType Leaf) {
        $size = (Get-Item $path).Length
        if ($size -eq 0) {
            Write-Host "  [EMPTY]  $path" -ForegroundColor Yellow
            $script:missing++
        } else {
            Write-Host "  [  OK  ]  $path" -ForegroundColor Green
            $script:found++
        }
    } else {
        Write-Host "  [MISSING] $path" -ForegroundColor Red
        $script:missing++
    }
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host "  COCO PHASE 3 VERIFICATION" -ForegroundColor Magenta
Write-Host "=================================================================" -ForegroundColor Magenta

Write-Host ""
Write-Host "-- Ed25519 keys ------------------------------------------------" -ForegroundColor White
Check-File 'secrets/ed25519_private.pem'
Check-File 'secrets/ed25519_public.pem'
Check-File 'secrets/ed25519_private.b64'
Check-File 'secrets/ed25519_public.b64'
Check-File 'tools/generate-keys.mjs'

Write-Host ""
Write-Host "-- @coco/security package --------------------------------------" -ForegroundColor White
Check-File 'packages/coco-security/package.json'
Check-File 'packages/coco-security/tsconfig.json'
Check-File 'packages/coco-security/src/index.ts'
Check-File 'packages/coco-security/src/keys.ts'
Check-File 'packages/coco-security/src/tokens.ts'
Check-File 'packages/coco-security/src/audit.ts'
Check-File 'packages/coco-security/src/permissions.ts'

Write-Host ""
Write-Host "-- Web app security wiring -------------------------------------" -ForegroundColor White
Check-File 'apps/web/src/lib/supabase/service.ts'
Check-File 'apps/web/src/lib/coco/security/context.ts'
Check-File 'apps/web/src/lib/coco/security/store.ts'
Check-File 'apps/web/src/app/(app)/security/page.tsx'
Check-File 'apps/web/src/app/api/security/self-test/route.ts'

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host "  Files found:   $found" -ForegroundColor Green
Write-Host "  Files missing: $missing" -ForegroundColor $(if ($missing -eq 0) { 'Green' } else { 'Red' })
Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host ""

if ($missing -eq 0) {
    Write-Host "  [SUCCESS] All files present" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "    1. Ensure .env.local has COCO_ED25519_*_B64 vars set" -ForegroundColor Cyan
    Write-Host "    2. pnpm install" -ForegroundColor Cyan
    Write-Host "    3. pnpm --filter web typecheck" -ForegroundColor Cyan
    Write-Host "    4. pnpm dev" -ForegroundColor Cyan
    Write-Host "    5. Sign in, open /security, verify all checks pass" -ForegroundColor Cyan
} else {
    Write-Host "  [ERROR] Missing files -- re-run the file creation steps" -ForegroundColor Red
}
Write-Host ""
