$root = Split-Path -Parent $PSScriptRoot

$apps = @()
$apps += New-Object psobject -Property @{ Name = "main-app"; Port = 8080 }
$apps += New-Object psobject -Property @{ Name = "vue-app"; Port = 8081 }
$apps += New-Object psobject -Property @{ Name = "react-app"; Port = 8082 }
$apps += New-Object psobject -Property @{ Name = "hero-card-app"; Port = 8084 }
$apps += New-Object psobject -Property @{ Name = "info-statistics-api"; Port = 8090 }

foreach ($app in $apps) {
  $existing = Get-NetTCPConnection -LocalPort $($app.Port) -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" }
  if ($existing) {
    Write-Host "[$($app.Name)] port $($app.Port) is already running, skipped."
    continue
  }

  $appPath = Join-Path $root $app.Name
  Write-Host "[$($app.Name)] starting on port $($app.Port) ..."
  Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm run dev > dev-server.log 2> dev-server.err.log") -WorkingDirectory $appPath -WindowStyle Hidden
}

Write-Host ""
Write-Host "Start commands sent. Please wait 10-20 seconds."
Start-Sleep -Seconds 8
Start-Process "http://localhost:8080/#/hero-cards"
