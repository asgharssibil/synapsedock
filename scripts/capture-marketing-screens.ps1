param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\outputs')
)

$ErrorActionPreference = 'Stop'
$WorkspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
if (-not $OutputDirectory.StartsWith($WorkspaceRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Screenshot output must stay inside the workspace.'
}

$electron = Join-Path $WorkspaceRoot 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path -LiteralPath $electron)) { throw "Electron runtime not found: $electron" }
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddHHmmss')
$captures = @{}
$env:UAIW_MARKETING_CAPTURE = '1'

foreach ($variant in @('dark-fa', 'en-light')) {
  $root = Join-Path $WorkspaceRoot "work\marketing-$variant-$stamp"
  $captures[$variant] = $root
  $env:UAIW_SMOKE_DIR = $root
  if ($variant -eq 'en-light') { $env:UAIW_SMOKE_VARIANT = 'en-light' }
  else { Remove-Item Env:UAIW_SMOKE_VARIANT -ErrorAction SilentlyContinue }
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

  $process = Start-Process -FilePath $electron -ArgumentList $WorkspaceRoot -PassThru -Wait -WindowStyle Hidden
  if ($process.ExitCode -ne 0) { throw "Marketing capture $variant exited with $($process.ExitCode)" }
  $result = Get-Content -LiteralPath (Join-Path $root 'smoke.json') -Raw | ConvertFrom-Json
  if ($result.renderer.title -ne 'SynapseDock') { throw "Unexpected title in $variant capture: $($result.renderer.title)" }
  if ($variant -eq 'en-light' -and ($result.renderer.lang -ne 'en' -or $result.renderer.dir -ne 'ltr' -or $result.renderer.theme -ne 'light')) {
    throw 'English light capture did not reach the expected locale, direction and theme.'
  }
}

Remove-Item Env:UAIW_SMOKE_DIR -ErrorAction SilentlyContinue
Remove-Item Env:UAIW_SMOKE_VARIANT -ErrorAction SilentlyContinue
Remove-Item Env:UAIW_MARKETING_CAPTURE -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $captures['dark-fa'] 'renderer.png') -Destination (Join-Path $OutputDirectory 'ui-dark-fa-rtl.png') -Force
Copy-Item -LiteralPath (Join-Path $captures['en-light'] 'renderer.png') -Destination (Join-Path $OutputDirectory 'ui-light-en-ltr.png') -Force

[pscustomobject]@{
  DarkPersian = Join-Path $OutputDirectory 'ui-dark-fa-rtl.png'
  LightEnglish = Join-Path $OutputDirectory 'ui-light-en-ltr.png'
} | Format-List
