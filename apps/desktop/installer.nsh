; Custom NSIS hooks for DP Days Counter.
;
; Earlier versions (1.0.4) ran `taskkill /f /im explorer.exe` here to refresh
; the Windows icon cache. That hammered the user's shell — Explorer windows
; flashed open during install and the desktop/taskbar disappeared until the
; shell restarted. Modern Windows 10/11 refreshes per-app icons automatically
; whenever a new shortcut is created, so the manual refresh is unnecessary.
;
; The macros are intentionally empty so electron-builder still picks up the
; `include` directive without doing anything destructive.

!macro customInstall
!macroend

!macro customUnInstall
!macroend
