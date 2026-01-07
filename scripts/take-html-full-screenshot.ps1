# Take full page screenshot of HTML file
$htmlPath = "C:\Users\yasho\OneDrive\デスクトップ\staging-verification-urls.html"
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outputPath = "staging-verification-urls-full-screenshot-$timestamp.png"

Write-Host "Opening HTML file: $htmlPath"
Start-Process $htmlPath

Write-Host "Waiting for page to load (15 seconds)..."
Write-Host "Please scroll down to the bottom of the page if needed"
Start-Sleep -Seconds 15

Write-Host "Taking screenshot..."
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)

$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

$fileSize = (Get-Item $outputPath).Length / 1KB
Write-Host "Screenshot saved: $outputPath"
Write-Host "File size: $([math]::Round($fileSize, 2)) KB"

Start-Process $outputPath

Write-Host ""
Write-Host "Note: For full page screenshot (including scrolled content),"
Write-Host "use browser DevTools: F12 -> Ctrl+Shift+P -> 'Capture full size screenshot'"




