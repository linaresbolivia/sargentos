Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('C:\Users\HP\Desktop\Nueva carpeta\MODELO INSTRUCTIVOS.docx')
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = $reader.ReadToEnd()
$stream.Close()
$zip.Dispose()
$text = [System.Text.RegularExpressions.Regex]::Replace($xml, '<[^>]+>', ' ')
$text = [System.Text.RegularExpressions.Regex]::Replace($text, '\s+', ' ')
Write-Output $text
