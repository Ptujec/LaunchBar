activate application "NotificationCenter"
tell application "System Events"
	try
		set _buttons to buttons of UI element 1 of scroll area 1 of window "Notification Center" of application process "NotificationCenter"
		
		repeat with _button in _buttons
			if title of _button is in {"Bestätigen, weniger anzuzeigen", "Confirm Show Less"} then
				click _button
			end if
			delay 0.1
		end repeat
	end try
end tell

tell application "LaunchBar" to activate