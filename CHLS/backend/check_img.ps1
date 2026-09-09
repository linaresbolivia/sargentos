Add-Type -AssemblyName System.Drawing
$filePath = "C:\Users\HP\.gemini\antigravity-ide\brain\dfe3f9ec-8af9-43c6-8ee2-e16a42830d52\.user_uploaded\media_1788905854737.jpg"
$img = [System.Drawing.Image]::FromFile($filePath)
Write-Host "Width: $($img.Width), Height: $($img.Height)"
$img.Dispose()
