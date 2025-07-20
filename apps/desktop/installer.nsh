!macro customInstall
  ; Clear icon cache to force refresh
  ExecWait 'ie4uinit.exe -show'
  ExecWait 'ie4uinit.exe -ClearIconCache'
  ExecWait 'taskkill /f /im explorer.exe'
  Sleep 1000
  ExecWait 'explorer.exe'
!macroend

!macro customUnInstall
  ; Clear icon cache on uninstall
  ExecWait 'ie4uinit.exe -show'
  ExecWait 'ie4uinit.exe -ClearIconCache'
  ExecWait 'taskkill /f /im explorer.exe'
  Sleep 1000
  ExecWait 'explorer.exe'
!macroend 