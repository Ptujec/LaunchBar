-- Uptime by Ptujec
-- 2011-01-11

set _text to do shell script "uptime | awk 'BEGIN {FS = \",\"} {print $1, $2}' | tail -c+10"

tell application "LaunchBar"
	display in large type _text with title "Uptime:"
	delay 1.5
	hide
end tell