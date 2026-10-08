Get-ChildItem -Path "C:\" -Filter "*.mdw" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
