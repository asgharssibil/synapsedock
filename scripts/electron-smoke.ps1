param(
  [string]$SmokeRoot = (Join-Path $PSScriptRoot '..\work\electron-smoke-ci')
)

$ErrorActionPreference = 'Stop'
$SmokeRoot = [IO.Path]::GetFullPath($SmokeRoot)
$WorkspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $SmokeRoot.StartsWith($WorkspaceRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'SmokeRoot must stay inside the workspace.'
}

if (Test-Path -LiteralPath $SmokeRoot) {
  Remove-Item -LiteralPath $SmokeRoot -Recurse
}

function Invoke-SmokePass {
  param([int]$ExpectedBefore, [int]$ExpectedAfter)
  $env:UAIW_SMOKE_DIR = $SmokeRoot
  Remove-Item Env:UAIW_SMOKE_VARIANT -ErrorAction SilentlyContinue
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  $electron = Join-Path $WorkspaceRoot 'node_modules\electron\dist\electron.exe'
  $process = Start-Process -FilePath $electron -ArgumentList $WorkspaceRoot -PassThru -Wait -WindowStyle Hidden
  if ($process.ExitCode -ne 0) { throw "Electron exited with $($process.ExitCode)" }
  $resultPath = Join-Path $SmokeRoot 'smoke.json'
  $imagePath = Join-Path $SmokeRoot 'renderer.png'
  if (-not (Test-Path -LiteralPath $resultPath)) { throw 'Smoke result was not created.' }
  if (-not (Test-Path -LiteralPath $imagePath)) { throw 'Renderer screenshot was not created.' }
  $result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
  if ($result.electron -ne '45.1.0') { throw "Unexpected Electron version: $($result.electron)" }
  if (-not $result.renderer.hasAppShell) { throw 'Renderer app shell did not mount.' }
  if (-not $result.renderer.ipcTaskPersisted) { throw 'IPC task round-trip failed.' }
  if (-not $result.credentialEncrypted) { throw 'Credential plaintext was found in the vault file.' }
  if ($result.renderer.tasksBefore -ne $ExpectedBefore -or $result.renderer.tasksAfter -ne $ExpectedAfter) {
    throw "Restart persistence mismatch: before=$($result.renderer.tasksBefore), after=$($result.renderer.tasksAfter)"
  }
  if ((Get-Item -LiteralPath $imagePath).Length -lt 10kb) { throw 'Renderer screenshot is unexpectedly small.' }
}

Invoke-SmokePass -ExpectedBefore 0 -ExpectedAfter 1
Invoke-SmokePass -ExpectedBefore 1 -ExpectedAfter 2
Write-Output 'Electron E2E passed: renderer, preload, IPC, SQLite restart recovery, screenshot, and OS credential encryption.'
