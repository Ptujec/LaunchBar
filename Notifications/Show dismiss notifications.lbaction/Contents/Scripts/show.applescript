(* 
Show Notifications AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15
requires macOS 15 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

tell application "System Events"
	set _stack to first UI element of UI element 1 of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter" whose subrole is "AXNotificationCenterAlertStack"
	
	
	if _stack is not "" then
		perform action "AXPress" of _stack
		set s to "success"
	else
		set s to "fail"
	end if
	
	
	if s is "success" then
		tell application "LaunchBar" to activate
	end if
	
	return s
end tell

