# Levanta la app (si no está corriendo) y la abre en el navegador. Lo usa el acceso directo del escritorio.
$root = Split-Path $PSScriptRoot -Parent
$lockFile = Join-Path $root ".next\dev\lock"

# next dev deja en este lock la URL del servidor activo; si ya hay uno, se reutiliza.
function Get-RunningUrl {
  if (-not (Test-Path $lockFile)) { return $null }
  # next dev mantiene el archivo abierto: hay que leerlo en modo compartido.
  $stream = [System.IO.File]::Open($lockFile, "Open", "Read", "ReadWrite, Delete")
  try {
    $lock = (New-Object System.IO.StreamReader($stream)).ReadToEnd() | ConvertFrom-Json
  } finally {
    $stream.Dispose()
  }
  if (Get-Process -Id $lock.pid -ErrorAction SilentlyContinue) { return $lock.appUrl }
  return $null
}

$url = Get-RunningUrl
if (-not $url) {
  # Puerto propio para no chocar con otros proyectos en el 3000. Cerrar esta ventana apaga la app.
  Start-Process powershell -WorkingDirectory $root -WindowStyle Minimized -ArgumentList "-NoProfile", "-Command", "`$host.UI.RawUI.WindowTitle = 'Job Hunter'; pnpm dev --port 3210"
  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    $url = Get-RunningUrl
    if ($url) {
      try {
        Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 10 | Out-Null
        break
      } catch {}
    }
    Start-Sleep -Milliseconds 500
  }
}

Start-Process $url
