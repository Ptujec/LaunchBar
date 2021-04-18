-- Clean Shut Down
-- Ptujec 2011-08-27

do shell script "defaults write com.apple.loginwindow TALLogoutSavesState 0"
delay 1
tell application "System Events" to shut down
