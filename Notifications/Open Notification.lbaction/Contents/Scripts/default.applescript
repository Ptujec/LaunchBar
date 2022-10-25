tell application "System Events"
	set _group to group 1 of UI element 1 of scroll area 1 of group 1 of window "Notification Center" of application process "NotificationCenter"
	set _actions to actions of _group
	try
		repeat with _action in _actions
			if description of _action is in {"Anzeigen", "Show"} then
				perform _action
				exit repeat
			else
				click _group
			end if
		end repeat
	end try
end tell