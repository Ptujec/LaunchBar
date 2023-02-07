(* 
Open in Arc Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-07

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run
	if application "Safari" is running then
		try
			tell application "Safari"
				if exists URL of current tab of window 1 then
					set vURL to URL of current tab of window 1
					
					tell application "Arc"
						activate
						delay 0.1
						if windows = {} then
							make new window
						end if
						tell front window to make new tab with properties {URL:vURL}
					end tell
					
					tell application "Safari"
						close current tab of window 1
						delay 0.1
						if (count documents) = 0 then
							quit application "Safari"
						end if
					end tell
				end if
			end tell
			
		on error e
			tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
		end try
	end if
end run