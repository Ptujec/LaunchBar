on run
	if application "Brave Browser" is running then	
		try
			tell application "Brave Browser"
				if (count windows) ­ 0 then
					set vURL to URL of active tab of window 1
					
					if vURL ­ "chrome://newtab/" then
						tell application "Safari"
							open location vURL
							activate
						end tell

						tell application "Brave Browser"
							close active tab of window 1
							delay 0.5
							if (count windows) = 0 then
								quit application "Brave Browser"
							end if
						end tell
					end if
				end if
			end tell
			
		on error e
			tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
		end try
	end if
end run