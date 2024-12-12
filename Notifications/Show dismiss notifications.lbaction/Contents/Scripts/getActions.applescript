(* 
Get Notification Actions AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-12

requires macOS 15.2

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run
	try
		tell application "System Events"
			set _main_group to group 1 of scroll area 1 of group 1 of group 1 of window 1 of application process "NotificationCenter"
			set _groups to groups of _main_group whose subrole is "AXNotificationCenterAlert"
			
			if _groups is {} then
				set _group to _main_group
			else
				set _group to item 1 of _groups
			end if
			
			set _actions to description of actions of _group whose name does not contain "AX"
		end tell
		return _actions
	on error eStr number eNum
		return "Error " & eNum & ": " & eStr
	end try
end run