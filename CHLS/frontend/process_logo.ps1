Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\HP\.gemini\antigravity-ide\brain\46d159b7-8d90-42dd-abc0-b590cb541aba\.user_uploaded\media_1788042598497.png"
$webLogoDest = "c:\Users\HP\Documents\CHLS\frontend\src\assets\logo.png"
$publicLogoDest = "c:\Users\HP\Documents\CHLS\frontend\public\logo.png"

$srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)

$minX = 347
$maxX = 680
$minY = 77
$maxY = 495

$cropW = $maxX - $minX
$cropH = $maxY - $minY

$cropRect = New-Object System.Drawing.Rectangle $minX, $minY, $cropW, $cropH
$cropped = $srcImg.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# 360x360 provides ultra-sharp retina rendering for all UI sizes (16px to 96px) while weighing under 90KB
$finalSize = 360
$finalBmp = New-Object System.Drawing.Bitmap $finalSize, $finalSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($finalBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

$availSize = $finalSize - 12
$scale = [Math]::Min($availSize / $cropW, $availSize / $cropH)
$destW = [int]($cropW * $scale)
$destH = [int]($cropH * $scale)
$destX = [int](($finalSize - $destW) / 2)
$destY = [int](($finalSize - $destH) / 2)

$destRect = New-Object System.Drawing.Rectangle $destX, $destY, $destW, $destH
$g.DrawImage($cropped, $destRect, 0, 0, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$finalBmp.Save($webLogoDest, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Optimized Web Logo Size: $((Get-Item $webLogoDest).Length) bytes"

if (Test-Path "c:\Users\HP\Documents\CHLS\frontend\public") {
    $finalBmp.Save($publicLogoDest, [System.Drawing.Imaging.ImageFormat]::Png)
}

$cropped.Dispose()
$finalBmp.Dispose()
$srcImg.Dispose()
