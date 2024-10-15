(* 
Run Notification Action AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15
requires macOS 15 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run (argument)
	set argument to argument as string
	tell application "System Events"
		set _button1 to last button of UI element 1 of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter" whose subrole is "AXNotificationCenterAlert"
		
		set _actions to actions of _button1
		repeat with _action in _actions
			if description of _action is argument then
				perform _action
				exit repeat
			end if
		end repeat
	end tell
end run