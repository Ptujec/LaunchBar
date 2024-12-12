(* 
Open Notification AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-12
requires macOS 15.2

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

property showActionSet : {"Anzeigen", "Show"} # add "show" in you language here 
property alertAndBannerSet : {"AXNotificationCenterAlert", "AXNotificationCenterBanner"}

tell application "System Events"
	try
		set _main_group to group 1 of scroll area 1 of group 1 of group 1 of window 1 of application process "NotificationCenter"
		set _groups to groups of _main_group whose subrole is "AXNotificationCenterAlert"
		
		if _groups is {} then
			if subrole of _main_group is in alertAndBannerSet then
				set _group to _main_group
			else
				return
			end if
		else
			set _group to item 1 of _groups
		end if
		
		set _test to _group
		
		set _actions to actions of _group
		
		set _showActionExists to false
		repeat with _action in _actions
			if description of _action is in showActionSet then
				perform _action
				set _showActionExists to true
				exit repeat
			end if
		end repeat
		
		if _showActionExists is false then
			perform action "AXPress" of _group
		end if
		
	on error eStr number eNum
		display notification eStr with title "Error " & eNum sound name "Frog"
	end try
	
end tell
