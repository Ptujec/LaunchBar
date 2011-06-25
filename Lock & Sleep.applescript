-- Ptujec
-- 2010-10-08

tell application "LaunchBar" to hide
delay 0.4
do shell script "/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend"
delay 0.6
tell application "System Events" to sleep