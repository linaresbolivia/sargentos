Add-Type -AssemblyName System.IO.Compression.FileSystem

$folder = "C:\Users\HP\Desktop\Nueva carpeta"
$files = Get-ChildItem -Path $folder -Filter "*.docx"

foreach ($file in $files) {
    Write-Output "================================================================="
    Write-Output "FILE: $($file.Name)"
    Write-Output "================================================================="
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
        $entry = $zip.GetEntry('word/document.xml')
        if ($entry) {
            $stream = $entry.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            $xml = $reader.ReadToEnd()
            $stream.Close()
            $zip.Dispose()
            $text = [System.Text.RegularExpressions.Regex]::Replace($xml, '<[^>]+>', ' ')
            $text = [System.Text.RegularExpressions.Regex]::Replace($text, '\s+', ' ')
            Write-Output $text
        } else {
            $zip.Dispose()
            Write-Output "No word/document.xml"
        }
    } catch {
        Write-Output "Error: $_"
    }
}
