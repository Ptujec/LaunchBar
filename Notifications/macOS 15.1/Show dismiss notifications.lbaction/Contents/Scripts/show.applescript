(* 
Show Notifications AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15
requires macOS 15.1 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

tell application "System Events"
	try
		set _window to window "Notification Center" of application process "NotificationCenter" # no notifications showing
	on error eStr number eNum
		return "Error " & eNum & ": " & eStr
	end try
	
	try
		set _stack to first UI element of scroll area 1 of group 1 of group 1 of _window whose subrole is "AXNotificationCenterAlertStack"
		perform action "AXPress" of _stack
		return "success"
	on error e
		return "fail"
	end try
end tell

