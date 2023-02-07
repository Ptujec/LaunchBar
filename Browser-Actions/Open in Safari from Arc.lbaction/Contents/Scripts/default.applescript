(* 
Open in Safari form Arc Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-07

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
 *)

on run
	if application "Arc" is running then

		try
			tell application "Arc"
				if windows ­ {} then
					set vURL to URL of active tab of window 1
					
					tell application "Safari"
						open location vURL
						activate
					end tell
					
					tell application "Arc"
						close active tab of window 1
						delay 0.5
						if (count of windows) = 0 then
							quit application "Arc"
							
						else if (count of windows) = 1 then
							if title of window 1 begins with "Space" then
								quit application "Arc"
							end if
						end if
					end tell
				end if
			end tell
			
		on error e
			tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
		end try
	end if
	
end run