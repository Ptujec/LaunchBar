# https://eastmanreference.com/complete-list-of-applescript-key-codes
on handle_string(s)
	try
		tell application "Music"
			activate
			if visible of window 1 is false then
				tell application "System Events"
					click menu item "Musik" of menu "Fenster" of menu bar item "Fenster" of menu bar 1 of application process "Music"
				end tell
			end if
		end tell
		delay 0.05
		tell application "System Events"
			# pressing "tab" avoids error sound when search field is already active É also prevents messing up the entry É it kind of resets the search field 
			key code 48
			delay 0.05
			keystroke "f" using command down
			#			delay 0.1
			#			keystroke "a" using command down
			delay 0.05
			keystroke s
			delay 0.1
			keystroke return
		end tell
	end try
end handle_string