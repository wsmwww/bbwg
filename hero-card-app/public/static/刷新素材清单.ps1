$assets = Join-Path $PSScriptRoot "assets"
$manifest = Join-Path $assets "image-manifest.js"

if (-not (Test-Path $assets)) {
  New-Item -ItemType Directory -Path $assets | Out-Null
}

$files = Get-ChildItem -Path $assets -Recurse -File |
  Where-Object {
    $_.Name -ne "image-manifest.js" -and
    $_.Extension -match "^\.(png|jpe?g|webp|gif|bmp|svg)$"
  } |
  Sort-Object FullName |
  ForEach-Object {
    $_.FullName.Substring($assets.Length + 1).Replace("\", "/")
  }

$lines = @("window.HERO_ASSETS = [")
for ($i = 0; $i -lt $files.Count; $i++) {
  $comma = if ($i -lt $files.Count - 1) { "," } else { "" }
  $safe = $files[$i].Replace('"', '\"')
  $lines += "  ""$safe""$comma"
}
$lines += "];"

[System.IO.File]::WriteAllLines($manifest, $lines, [System.Text.Encoding]::UTF8)
Write-Host "已刷新素材清单，共 $($files.Count) 张图片。"
Read-Host "按回车关闭"
