tell application "System Events"
	try
		set _buttons to buttons of UI element 1 of scroll area 1 of window "Notification Center" of application process "NotificationCenter"
		
		repeat with _button in _buttons
			if title of _button is in {"Bestätigen, weniger anzuzeigen", "Confirm Show Less"} then
				click _button
			end if
			delay 0.1
		end repeat
		
		set _count to count of groups of UI element 1 of scroll area 1 of window "Notification Center" of application process "NotificationCenter"
		
		set _index to _count
		
		repeat _count times
			set _group to group _index of UI element 1 of scroll area 1 of window "Notification Center" of application process "NotificationCenter"
			
			set _actions to actions of _group
			repeat with _action in _actions
				if description of _action is in {"Close", "Clear All", "Schließen", "Alle entfernen"} then
					perform _action
				end if
			end repeat
			
			set _index to (_index - 1)
			delay 0.7 -- without the delay the script gets confused
		end repeat
	end try
end tell