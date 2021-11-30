tell application "System Events"
	
	set activeApp to bundle identifier of application processes whose frontmost is true
	
	activate application "NotificationCenter"
	
	try
		set _buttons to buttons of UI element 1 of scroll area 1 of window "Notification Center" of application process "NotificationCenter"
		
		repeat with _button in _buttons
			if title of _button is in {"Best�tigen, weniger anzuzeigen", "Confirm Show Less"} then
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
				if description of _action is in {"Schlie�en", "Alle entfernen", "Close", "Clear All"} then
					perform _action
				end if
			end repeat
			
			set _index to (_index - 1)
			delay 0.9 -- without the delay 
		end repeat
	end try
end tell

set activeApp to activeApp as text
activate application id activeApp