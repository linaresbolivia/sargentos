Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\HP\.gemini\antigravity-ide\brain\46d159b7-8d90-42dd-abc0-b590cb541aba\.user_uploaded\media_1788042598497.png"
$srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Output "Pixel Format: $($srcImg.PixelFormat)"

# Find non-transparent or non-black pixels (where A > 20 and not black margin)
$minX = $srcImg.Width
$maxX = 0
$minY = $srcImg.Height
$maxY = 0

for ($y = 0; $y -lt $srcImg.Height; $y++) {
    for ($x = 0; $x -lt $srcImg.Width; $x++) {
        $c = $srcImg.GetPixel($x, $y)
        # Look for visible shield pixels (Alpha > 20 and brightness > 15)
        if ($c.A -gt 20 -and ($c.R -gt 20 -or $c.G -gt 20 -or $c.B -gt 20)) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Output "Actual Shield Bounds: X: $minX to $maxX (Width: $($maxX - $minX)), Y: $minY to $maxY (Height: $($maxY - $minY))"
$srcImg.Dispose()
