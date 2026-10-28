param(
  [string]$ReleaseDirectory = (Join-Path $PSScriptRoot '..\release'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\outputs')
)

$ErrorActionPreference = 'Stop'
$WorkspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$ReleaseDirectory = [IO.Path]::GetFullPath($ReleaseDirectory)
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)

foreach ($path in @($ReleaseDirectory, $OutputDirectory)) {
  if (-not $path.StartsWith($WorkspaceRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Release paths must stay inside the workspace: $path"
  }
}

$package = Get-Content -LiteralPath (Join-Path $WorkspaceRoot 'package.json') -Raw | ConvertFrom-Json
$installerName = "SynapseDock-Setup-$($package.version).exe"
$installerSource = Join-Path $ReleaseDirectory $installerName
$installerOutput = Join-Path $OutputDirectory $installerName
$releaseNotesSource = Join-Path $WorkspaceRoot "RELEASE_NOTES_v$($package.version).md"
$releaseNotesOutput = Join-Path $OutputDirectory "RELEASE_NOTES_v$($package.version).md"
$checksumOutput = Join-Path $OutputDirectory 'SHA256SUMS.txt'

if (-not (Test-Path -LiteralPath $installerSource)) {
  throw "Installer not found: $installerSource. Run npm run dist:win first."
}
if (-not (Test-Path -LiteralPath $releaseNotesSource)) {
  throw "Release notes not found: $releaseNotesSource"
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
Copy-Item -LiteralPath $installerSource -Destination $installerOutput -Force
Copy-Item -LiteralPath $releaseNotesSource -Destination $releaseNotesOutput -Force

$sha256 = [Security.Cryptography.SHA256]::Create()
$stream = [IO.File]::OpenRead($installerOutput)
try {
  $hash = [BitConverter]::ToString($sha256.ComputeHash($stream)).Replace('-', '')
}
finally {
  $stream.Dispose()
  $sha256.Dispose()
}
"$hash  $installerName" | Set-Content -LiteralPath $checksumOutput -Encoding ascii

[pscustomobject]@{
  Installer = $installerOutput
  Bytes = (Get-Item -LiteralPath $installerOutput).Length
  SHA256 = $hash
  Checksums = $checksumOutput
  ReleaseNotes = $releaseNotesOutput
} | Format-List
