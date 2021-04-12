on handle_string(s)
	try
	tell application "System Events"
		set _processes to (get name of every application process)
		if _processes contains "Notion" then
			tell application "Notion" to activate
			delay 0.01
			keystroke "p" using command down
			tell application "LaunchBar" to perform action "Copy and Paste" with string s
		else
			tell application "Notion" to activate
			delay 2
			keystroke "p" using command down
			tell application "LaunchBar" to perform action "Copy and Paste" with string s
		end if
	end tell
end try
end handle_string