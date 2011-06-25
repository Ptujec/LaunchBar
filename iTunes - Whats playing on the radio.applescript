-- by Ptujec
-- 2011-06-22

tell application "System Events"
	if process "iTunes" exists then
		set okflag to true --iTunes is running
	else
		set okflag to false
	end if
end tell

if okflag is true then
	tell application "iTunes" to set _name to current stream title as text
	set the clipboard to _name
	tell application "LaunchBar" to set selection to the clipboard
end if