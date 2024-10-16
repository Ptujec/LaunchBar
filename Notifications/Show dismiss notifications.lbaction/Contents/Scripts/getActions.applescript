(* 
Get Notification Actions AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15

requires macOS 15 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run
	try
		tell application "System Events"
			set _button to last button of UI element 1 of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter" whose subrole is "AXNotificationCenterAlert"			
			set _actions to description of actions of _button whose name does not contain "AX"
			set beginning of _actions to description of the first action of _button whose name is "AXShowMenu"
		end tell
		return _actions
	on error eStr number eNum
		return "Error " & eNum & ": " & eStr
	end try
end run