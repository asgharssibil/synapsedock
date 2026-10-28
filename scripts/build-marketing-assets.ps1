param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\marketing')
)

$ErrorActionPreference = 'Stop'
$WorkspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
if (-not $OutputDirectory.StartsWith($WorkspaceRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Marketing output must stay inside the workspace.'
}

$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$background = Join-Path $WorkspaceRoot 'assets\marketing\social-background-v1.png'
$icon = Join-Path $WorkspaceRoot 'assets\app-icon.png'
$dark = Join-Path $WorkspaceRoot 'outputs\ui-dark-fa-rtl.png'
$light = Join-Path $WorkspaceRoot 'outputs\ui-light-en-ltr.png'
$socialPreview = Join-Path $OutputDirectory 'social-preview.jpg'
$demoGif = Join-Path $OutputDirectory 'demo.gif'

foreach ($inputPath in @($background, $icon, $dark, $light)) {
  if (-not (Test-Path -LiteralPath $inputPath)) { throw "Missing marketing input: $inputPath" }
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$bold = 'C\:/Windows/Fonts/segoeuib.ttf'
$regular = 'C\:/Windows/Fonts/segoeui.ttf'
$socialFilter = @"
[0:v]scale=1280:853,crop=1280:640:0:106,eq=brightness=-0.10:saturation=0.88[bg];
[2:v]scale=600:-2,crop=600:360:0:(ih-360)/2[shot];
[bg]drawbox=x=590:y=93:w=640:h=454:color=0x050711@0.62:t=fill,drawbox=x=590:y=93:w=640:h=454:color=0x8775ff@0.55:t=2[frame];
[frame][shot]overlay=610:140[withshot];
[1:v]scale=92:92[logo];
[withshot][logo]overlay=68:64,
drawtext=fontfile='$bold':text='SynapseDock':fontcolor=white:fontsize=64:x=68:y=180,
drawtext=fontfile='$regular':text='Persistent AI work. Resilient by design.':fontcolor=0xcfd5ff:fontsize=28:x=72:y=262,
drawtext=fontfile='$regular':text='Provider routing  -  Quota awareness':fontcolor=0xaeb8da:fontsize=22:x=72:y=336,
drawtext=fontfile='$regular':text='Persistent tasks  -  Failover recovery':fontcolor=0xaeb8da:fontsize=22:x=72:y=378,
drawbox=x=70:y=460:w=370:h=58:color=0x7462e8@0.92:t=fill,
drawtext=fontfile='$bold':text='Windows desktop workspace':fontcolor=white:fontsize=20:x=94:y=478,
format=yuvj420p[out]
"@

& $ffmpeg -hide_banner -loglevel error -y `
  -i $background -i $icon -i $dark `
  -filter_complex $socialFilter -map '[out]' -frames:v 1 -q:v 2 $socialPreview
if ($LASTEXITCODE -ne 0) { throw 'Social preview generation failed.' }

$gifFilter = @"
[0:v]scale=900:-2,crop=900:506:0:(ih-506)/2,
drawbox=x=0:y=388:w=900:h=118:color=0x060914@0.90:t=fill,
drawtext=fontfile='$bold':text='Your AI work, one resilient desktop':fontcolor=white:fontsize=34:x=40:y=408,
drawtext=fontfile='$regular':text='Persistent tasks and local recovery':fontcolor=0xbcc5e7:fontsize=22:x=42:y=456[s0];
[1:v]scale=1040:-2,crop=900:506:0:(ih-506)/2,
drawbox=x=0:y=388:w=900:h=118:color=0x060914@0.90:t=fill,
drawtext=fontfile='$bold':text='Quota-aware provider routing':fontcolor=white:fontsize=34:x=40:y=408,
drawtext=fontfile='$regular':text='Know what is ready, exhausted, or unknown':fontcolor=0xbcc5e7:fontsize=22:x=42:y=456[s1];
[2:v]scale=1040:-2,crop=900:506:140:(ih-506)/2,
drawbox=x=0:y=388:w=900:h=118:color=0x060914@0.90:t=fill,
drawtext=fontfile='$bold':text='Failover, checkpoints, and recovery':fontcolor=white:fontsize=34:x=40:y=408,
drawtext=fontfile='$regular':text='Designed to keep long-running work visible':fontcolor=0xbcc5e7:fontsize=22:x=42:y=456[s2];
[3:v]scale=900:-2,crop=900:506:0:(ih-506)/2,
drawbox=x=0:y=388:w=900:h=118:color=0x080b14@0.88:t=fill,
drawtext=fontfile='$bold':text='Persian or English. Dark or light.':fontcolor=white:fontsize=34:x=40:y=408,
drawtext=fontfile='$regular':text='A focused Windows workspace for AI operations':fontcolor=0xc6cdea:fontsize=22:x=42:y=456[s3];
[s0][s1][s2][s3]concat=n=4:v=1:a=0,fps=8,split[paletteInput][video];
[paletteInput]palettegen=max_colors=96:stats_mode=diff[palette];
[video][palette]paletteuse=dither=bayer:bayer_scale=5[gif]
"@

& $ffmpeg -hide_banner -loglevel error -y `
  -loop 1 -t 2 -i $dark `
  -loop 1 -t 2 -i $dark `
  -loop 1 -t 2 -i $dark `
  -loop 1 -t 2 -i $light `
  -filter_complex $gifFilter -map '[gif]' -loop 0 $demoGif
if ($LASTEXITCODE -ne 0) { throw 'Demo GIF generation failed.' }

[pscustomobject]@{
  SocialPreview = $socialPreview
  SocialPreviewBytes = (Get-Item -LiteralPath $socialPreview).Length
  DemoGif = $demoGif
  DemoGifBytes = (Get-Item -LiteralPath $demoGif).Length
} | Format-List
