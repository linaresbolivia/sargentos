# Script de Backup Completo para CHLS (PostgreSQL)
param(
    [string]$OutputDir = "$PSScriptRoot\backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$pgDumpPath = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
if (-not (Test-Path $pgDumpPath)) {
    # Buscar alternativas
    $found = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $pgDumpPath = $found.FullName
    } else {
        throw "No se encontró pg_dump.exe en C:\Program Files\PostgreSQL"
    }
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$sqlFile = Join-Path $OutputDir "backup_chls_completo_$timestamp.sql"
$dumpFile = Join-Path $OutputDir "backup_chls_completo_$timestamp.dump"

$env:PGPASSWORD = "postgres"

Write-Host "Iniciando Backup Completo de la base de datos 'chls'..." -ForegroundColor Cyan
Write-Host "Herramienta: $pgDumpPath" -ForegroundColor Gray
Write-Host "Destino SQL: $sqlFile" -ForegroundColor Gray
Write-Host "Destino Dump (Custom pg_restore): $dumpFile" -ForegroundColor Gray

# 1. Generar archivo .SQL completo (Esquema, Tablas, Registros, Funciones, Procedimientos, Triggers, Vistas, Secuencias)
Write-Host "`n[1/2] Exportando en formato SQL plano (.sql con DROP IF EXISTS, CREATE, INSERT/COPY y BLOBs)..." -ForegroundColor Yellow

& $pgDumpPath `
    --host="localhost" `
    --port="5432" `
    --username="postgres" `
    --dbname="chls" `
    --format="plain" `
    --clean `
    --if-exists `
    --create `
    --blobs `
    --encoding="UTF8" `
    --file="$sqlFile"

if ($LASTEXITCODE -ne 0) {
    throw "pg_dump falló al generar el archivo SQL plano con código $LASTEXITCODE"
}

$sqlSize = (Get-Item $sqlFile).Length / 1MB
Write-Host "-> SQL generado exitosamente: $([math]::Round($sqlSize, 2)) MB" -ForegroundColor Green

# 2. Generar archivo .DUMP en formato Custom de PostgreSQL (soporta pg_restore, compresión y restauración selectiva o paralela)
Write-Host "`n[2/2] Exportando en formato binario Custom (.dump comprimido para pg_restore)..." -ForegroundColor Yellow

& $pgDumpPath `
    --host="localhost" `
    --port="5432" `
    --username="postgres" `
    --dbname="chls" `
    --format="custom" `
    --blobs `
    --file="$dumpFile"

if ($LASTEXITCODE -ne 0) {
    throw "pg_dump falló al generar el archivo DUMP con código $LASTEXITCODE"
}

$dumpSize = (Get-Item $dumpFile).Length / 1MB
Write-Host "-> Dump generado exitosamente: $([math]::Round($dumpSize, 2)) MB" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "BACKUP COMPLETADO CON ÉXITO" -ForegroundColor Green
Write-Host "SQL:  $sqlFile ($([math]::Round($sqlSize, 2)) MB)" -ForegroundColor White
Write-Host "DUMP: $dumpFile ($([math]::Round($dumpSize, 2)) MB)" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Cyan
