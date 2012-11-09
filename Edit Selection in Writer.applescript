-- Ptujec 2012-11-09

on handle_string(s)
	tell application "iA Writer"
		make new document
		activate
		tell application "LaunchBar" to perform action "Copy and Paste" with string s
		delay 0.2
		tell application "System Events" to keystroke "d" using command down
		tell application "System Events" to keystroke "f" using {command down, control down}
	end tell
	
	
	--activate application "iA Writer"
	--tell application "System Events" to keystroke "a" using command down
	--tell application "LaunchBar" to perform action "Copy and Paste" with string s
end handle_string

on run
	
	-- tell application "System Events"
	--	if process "iA Writer" exists then
	--		set visible of process "iA Writer" to false
	--	end if
	-- end tell
	
	tell application "iA Writer"
		make new document
		activate
		delay 0.2
		tell application "System Events" to keystroke "d" using command down
		tell application "System Events" to keystroke "f" using {command down, control down}
	end tell
	
end run