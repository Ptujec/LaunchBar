-- Uptime by Ptujec
-- 2011-01-11

set _text to do shell script "uptime | awk 'BEGIN {FS = \",\"} {print $1, $2}' | tail -c+10"

return _text

# tell application "LaunchBar" to set selection to "Uptime: " & _text
