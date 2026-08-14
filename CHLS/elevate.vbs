Set UAC = CreateObject("Shell.Application") 
UAC.ShellExecute "cmd.exe", "/c netsh advfirewall firewall add rule name=""CHLS-Dev-Ports"" dir=in action=allow protocol=TCP localport=5000,5173", "", "runas", 1 
