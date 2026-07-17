$ports = @(8080, 8081, 8082, 8084, 8090)

foreach ($port in $ports) {
  Write-Host "Stopping port $port ..."
  $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($item in $connections) {
    Stop-Process -Id $item.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

Write-Host ""
Write-Host "All projects stopped."
