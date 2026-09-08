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
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  COCO PHASE 1 VERIFICATION" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta

Write-Host ""
Write-Host "── @coco/common package ──────────────────────────────────────" -ForegroundColor White
Check-File 'packages/coco-common/package.json'
Check-File 'packages/coco-common/tsconfig.json'
Check-File 'packages/coco-common/src/index.ts'
Check-File 'packages/coco-common/src/ids.ts'
Check-File 'packages/coco-common/src/hash.ts'
Check-File 'packages/coco-common/src/time.ts'
Check-File 'packages/coco-common/src/errors.ts'
Check-File 'packages/coco-common/src/result.ts'

Write-Host ""
Write-Host "── @coco/protocol package ────────────────────────────────────" -ForegroundColor White
Check-File 'packages/coco-protocol/package.json'
Check-File 'packages/coco-protocol/tsconfig.json'
Check-File 'packages/coco-protocol/src/index.ts'
Check-File 'packages/coco-protocol/src/enums.ts'
Check-File 'packages/coco-protocol/src/shared.ts'
Check-File 'packages/coco-protocol/src/envelope.ts'
Check-File 'packages/coco-protocol/src/mission.ts'
Check-File 'packages/coco-protocol/src/agent.ts'
Check-File 'packages/coco-protocol/src/tool.ts'
Check-File 'packages/coco-protocol/src/model.ts'
Check-File 'packages/coco-protocol/src/event.ts'
Check-File 'packages/coco-protocol/src/verification.ts'
Check-File 'packages/coco-protocol/src/error.ts'

Write-Host ""
Write-Host "── @coco/config package ──────────────────────────────────────" -ForegroundColor White
Check-File 'packages/coco-config/package.json'
Check-File 'packages/coco-config/tsconfig.json'
Check-File 'packages/coco-config/src/index.ts'
Check-File 'packages/coco-config/src/env.ts'
Check-File 'packages/coco-config/src/constitution.ts'

Write-Host ""
Write-Host "── Constitution YAML files ───────────────────────────────────" -ForegroundColor White
Check-File 'constitution/identity.yaml'
Check-File 'constitution/laws.yaml'
Check-File 'constitution/voice.yaml'
Check-File 'constitution/methods/coco_method.yaml'
Check-File 'constitution/cognitive/depth_policy.yaml'

Write-Host ""
Write-Host "── Web app integration ───────────────────────────────────────" -ForegroundColor White
Check-File 'apps/web/src/lib/coco/constitution.ts'
Check-File 'apps/web/src/app/(app)/constitution/page.tsx'

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  Files found:   $found" -ForegroundColor Green
Write-Host "  Files missing: $missing" -ForegroundColor $(if ($missing -eq 0) { 'Green' } else { 'Red' })
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

if ($missing -eq 0) {
    Write-Host "  ✅  ALL FILES PRESENT" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "    1. pnpm install" -ForegroundColor Cyan
    Write-Host "    2. pnpm --filter web typecheck" -ForegroundColor Cyan
    Write-Host "    3. pnpm dev" -ForegroundColor Cyan
    Write-Host "    4. Open http://localhost:3000/constitution" -ForegroundColor Cyan
    Write-Host "    5. Check http://localhost:3000/api/health" -ForegroundColor Cyan
} else {
    Write-Host "  ❌  MISSING FILES — re-run the file creation steps" -ForegroundColor Red
}
Write-Host ""
