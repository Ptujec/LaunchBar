(* 
Run Notification Action AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15
requires macOS 15.1 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run (argument)
	set argument to argument as string
	try
		tell application "System Events"
			set _button to first button of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter" whose subrole contains "AXNotificationCenterAlert"
			perform (first action of _button whose description is argument)
		end tell
	on error eStr number eNum
		display notification eStr with title "Error " & eNum sound name "Frog"
	end try
end run