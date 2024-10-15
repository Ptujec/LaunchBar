tell application "System Events"
	set _groups to groups of UI element 1 of scroll area 1 of window "Notification Center" of application process "NotificationCenter"
	
	repeat with _group in _groups
		set _actions to actions of _group
		repeat with _action in _actions
			if description of _action is in {"Clear All", "Alle entfernen"} then
				click _group
				set s to "success"
				exit repeat
			else
				set s to "fail"
			end if
		end repeat
		if s is "success" then
			tell application "LaunchBar" to activate
			exit repeat
		end if
	end repeat
	return s
end tell