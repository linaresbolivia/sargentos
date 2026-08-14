$connectionProfile = [Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]::GetInternetConnectionProfile()
$tetheringManager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager,Windows.Networking.NetworkOperators,ContentType=WindowsRuntime]::CreateFromConnectionProfile($connectionProfile)

if ($null -ne $tetheringManager) {
    # Configure SSID and Password
    $config = $tetheringManager.GetCurrentAccessPointConfiguration()
    $config.Ssid = 'tigre'
    $config.Passphrase = 'Tigre2026!'
    
    $configAsync = $tetheringManager.ConfigureAccessPointAsync($config)
    
    # Wait for the async task to finish (PowerShell 5.1 safe way)
    while ($configAsync.Status -eq 0) { Start-Sleep -Milliseconds 100 }
    
    # Start tethering
    $startAsync = $tetheringManager.StartTetheringAsync()
    while ($startAsync.Status -eq 0) { Start-Sleep -Milliseconds 100 }
    
    Write-Host "Hotspot 'tigre' configurado e iniciado exitosamente con clave: Tigre2026!"
} else {
    Write-Host "Error: No se pudo acceder a la configuracion del Hotspot. Verifica tu conexion a internet principal."
}
