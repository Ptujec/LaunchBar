on run (argument)
	set argument to argument as string
	activate application "NotificationCenter"
	tell application "System Events"
		set _group to group 1 of UI element 1 of scroll area 1 of window "Notification Center" of application process "NotificationCenter"
		
		set _actions to actions of _group
		repeat with _action in _actions
			if description of _action is argument then
				perform _action
				exit repeat
			end if
		end repeat
	end tell
end run