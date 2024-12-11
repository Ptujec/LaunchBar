(* 
Speek German Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-11

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on handle_string(s)
	main_action(s)
end handle_string

on handle_item(i)
	main_action(title of i)
end handle_item

on run
	tell application "System Events"
		keystroke "a" using command down
		keystroke "c" using command down
		
		delay 0.1
		set s to the clipboard
		key code 125
	end tell
	main_action(s)
end run

on main_action(s)
	try
		tell application "System Events"
			if (get name of every application process) contains "Music" then
				tell application "Music"
					if player state is playing then
						set currentvolume to the sound volume
						set sound volume to 30
						
						say s using "Anna (Premium)" speaking rate 200
						-- tell application "Shortcuts Events"  to run shortcut "Deutsch sprechen" with input s
						
						delay 0.5
						set the sound volume to currentvolume
					else
						say s using "Anna (Premium)" speaking rate 200
						-- tell application "Shortcuts Events"  to run shortcut "Deutsch sprechen" with input s
					end if
				end tell
			else
				say s using "Anna (Premium)" speaking rate 200
				-- tell application "Shortcuts Events"  to run shortcut "Deutsch sprechen" with input s
			end if
		end tell
	on error e
		tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
	end try
end main_action