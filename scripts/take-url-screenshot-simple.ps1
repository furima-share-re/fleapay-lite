# Take screenshot of verification URL
$Url = "https://fleapay-lite-t1.onrender.com"
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outputPath = "verification-url-screenshot-$timestamp.png"

Write-Host "Opening URL: $Url"
Start-Process $Url

Write-Host "Waiting for page to load (15 seconds)..."
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





