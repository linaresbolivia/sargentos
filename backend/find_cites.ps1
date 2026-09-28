$paths = @("C:\Users\HP\Desktop", "C:\Users\HP\Documents", "C:\Users\HP\Downloads")
$files = Get-ChildItem -Path $paths -Recurse -Include "*.docx","*.pdf","*.txt","*.xlsx" -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -match "cite|instructiv|corresp|modelo|plantilla|manual" -and $_.FullName -notmatch "node_modules|\.git|dist|AppData|Cache"
}
$files | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize
