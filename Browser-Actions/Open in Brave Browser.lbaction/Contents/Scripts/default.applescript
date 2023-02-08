on run
	if application "Safari" is running then
		try
			tell application "Safari"
				if exists URL of current tab of window 1 then
					set vURL to URL of current tab of window 1
					tell application "Brave Browser"
						--if windows ­ {} then
						if (count windows) ­ 0 then
							make new tab at the end of window 1 with properties {URL:vURL}
						else
							make new window
							set URL of (active tab of window 1) to vURL
						end if
						activate
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