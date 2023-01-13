--
-- Dismiss all active notifications
--
-- https://apple.stackexchange.com/questions/408019/dismiss-macos-big-sur-notifications-with-keyboard 

on run
	try
		activate application "NotificationCenter"
		tell application "System Events"
			tell process "Mitteilungszentrale"
				set theWindow to group 1 of UI element 1 of scroll area 1 of window "Notification Center"
				click theWindow
				delay 0.1
				
				set theActions to action of theWindow
				repeat with theAction in theActions
					if description of theAction is "Schlie§en" then
						tell theWindow
							perform theAction
						end tell
						# exit repeat
					end if
				end repeat
			end tell
		end tell
	on error e
		-- display dialog e
		-- activate
		tell application "LaunchBar" to display in notification center with title e subtitle e
	end try
end run
