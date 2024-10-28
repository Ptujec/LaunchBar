(* 
Open Notification AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-28
requires macOS 15.1

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

property showActionSet : {"Anzeigen", "Show"} # add "show" in you language here 

tell application "System Events"
	try
		set _button to first button of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter" whose subrole is "AXNotificationCenterAlert"
		set _actions to actions of _button
		
		set _showActionExists to false
		repeat with _action in _actions
			if description of _action is in showActionSet then
				perform _action
				set _showActionExists to true
				exit repeat
			end if
		end repeat
		
		if _showActionExists is false then
			perform action "AXPress" of _button
		end if
		
	on error eStr number eNum
		display notification eStr with title "Error " & eNum sound name "Frog"
	end try
	
end tell
