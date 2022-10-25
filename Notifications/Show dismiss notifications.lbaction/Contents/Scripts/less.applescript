tell application "System Events"
	try
		set _buttons to buttons of UI element 1 of scroll area 1 of group 1 of window "Notification Center" of application process "NotificationCenter"
		
		if (count of _buttons) is not 0 then
			click item 1 of _buttons
		end if
	end try
end tell

tell application "LaunchBar" to activate