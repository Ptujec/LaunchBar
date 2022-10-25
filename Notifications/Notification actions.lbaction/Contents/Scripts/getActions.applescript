on run
	tell application "System Events"
		set _group to group 1 of UI element 1 of scroll area 1 of group 1 of window "Notification Center" of application process "NotificationCenter"
		set _actions to description of actions of _group
	end tell
	return _actions
end run