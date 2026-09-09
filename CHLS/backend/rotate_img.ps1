Add-Type -AssemblyName System.Drawing
$filePath = "C:\Users\HP\.gemini\antigravity-ide\brain\dfe3f9ec-8af9-43c6-8ee2-e16a42830d52\.user_uploaded\media_1788905854737.jpg"
$outPath = "C:\Users\HP\Documents\CHLS\frontend\public\elections\papeleta_oficial.jpg"

$img = [System.Drawing.Image]::FromFile($outPath)
$img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone)
$img.Save($outPath + ".tmp", [System.Drawing.Imaging.ImageFormat]::Jpeg)
$img.Dispose()
Move-Item -Force ($outPath + ".tmp") $outPath
Write-Host "Rotated image saved to $outPath"
