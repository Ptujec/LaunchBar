(* 
Get Notification Actions AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15

requires macOS 15 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run
	tell application "System Events"
		
		set _button1 to first button of UI element 1 of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter" whose subrole contains "AXNotificationCenterAlert"
		
		set _actions to description of actions of _button1
	end tell
	return _actions
end run