on run (argument)
	set argument to argument as string
	activate application "NotificationCenter"
	tell application "System Events"
		set _groups to groups of UI element 1 of scroll area 1 of window "Notification Center" of application process "NotificationCenter"
		
		set _options to {}
		repeat with _group in _groups
			set _actions to actions of _group
			repeat with _action in _actions
				if description of _action is argument then
					perform _action
					exit repeat
				end if
			end repeat
			exit repeat
		end repeat
	end tell
end run