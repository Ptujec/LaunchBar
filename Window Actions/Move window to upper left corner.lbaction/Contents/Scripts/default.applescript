try
	tell application "System Events"
		tell (first process whose frontmost is true)
			set position of window 1 to {0, 25}
		end tell
	end tell
	
end try
