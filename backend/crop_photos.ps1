Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\HP\Documents\CHLS\frontend\public\elections\papeleta_oficial.jpg"
$outDir = "C:\Users\HP\Documents\CHLS\frontend\public\elections"

$src = [System.Drawing.Bitmap]::FromFile($sourcePath)

# Define candidates with their bounding box [x, y, w, h] in 768x1024 image
# We crop the photo area inside each card
$candidates = @(
    @{ name = "karel_rivero.jpg";        rect = @(96, 222, 52, 60) },
    @{ name = "miguel_chavez.jpg";       rect = @(235, 222, 52, 60) },
    @{ name = "alvaro_mendoza.jpg";      rect = @(375, 222, 52, 60) },
    @{ name = "edwin_portocarrero.jpg";  rect = @(515, 222, 52, 60) },
    @{ name = "mauricio_galindo.jpg";    rect = @(653, 222, 52, 60) },
    @{ name = "ramiro_vega.jpg";         rect = @(154, 430, 56, 62) },
    @{ name = "marco_salinas.jpg";       rect = @(294, 430, 56, 62) },
    @{ name = "carlos_poma.jpg";         rect = @(433, 430, 56, 62) },
    @{ name = "emilio_barea.jpg";        rect = @(570, 430, 56, 62) },
    @{ name = "guido_perez.jpg";         rect = @(197, 680, 56, 66) },
    @{ name = "santiago_goitia.jpg";     rect = @(507, 684, 56, 66) }
)

foreach ($c in $candidates) {
    $x, $y, $w, $h = $c.rect
    $cropRect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $target = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($target)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $g.DrawImage($src, $destRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $targetFile = Join-Path $outDir $c.name
    $target.Save($targetFile, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $target.Dispose()
    Write-Host "Saved: $($c.name)"
}

$src.Dispose()
Write-Host "All photos cropped successfully!"
