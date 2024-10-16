(* 
Open Notification AppleScript Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15
requires macOS 15 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)


tell application "System Events"
	try
		set _button to last button of UI element 1 of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter" whose subrole is "AXNotificationCenterAlert"
		set _actions to actions of _button
		
		set _showActionExists to false
		repeat with _action in _actions
			if description of _action is in {"Anzeigen", "Show"} then
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
