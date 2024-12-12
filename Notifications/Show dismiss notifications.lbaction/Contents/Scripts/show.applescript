(* 
Show Notifications AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-12
requires macOS 15.2 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

tell application "System Events"
	try
		set _main_group to group 1 of scroll area 1 of group 1 of group 1 of window 1 of application process "NotificationCenter"
	on error eStr number eNum
		return "Error " & eNum & ": " & eStr
	end try
	
	try
		if subrole of _main_group is missing value and role of _main_group is "AXGroup" then
			perform action "AXPress" of first group of _main_group
		end if
		return "success"
	on error e
		return "fail"
	end try
end tell