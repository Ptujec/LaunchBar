on handle_string(s)
	try
		tell application "System Events"
			if (get name of every application process) contains "Spotify" then
				tell application "Spotify"
					if player state is playing then
						pause
					end if
				end tell
				delay 0.5
			end if
			if (get name of every application process) contains "Music" then
				tell application "Music"
					if player state is playing then
						set currentvolume to the sound volume
						set sound volume to 30
						
						say s using "Samantha" speaking rate 220
						
						delay 0.5
						set the sound volume to currentvolume
					else
						say s using "Samantha" speaking rate 220
					end if
				end tell
			else
				say s using "Samantha" speaking rate 220
			end if
		end tell
	on error e
		tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
	end try
end handle_string

on run
	try
		tell application "System Events"
			if (get name of every application process) contains "Spotify" then
				tell application "Spotify"
					if player state is playing then
						pause
					end if
				end tell
				delay 0.5
			end if
			if (get name of every application process) contains "Music" then
				tell application "Music"
					if player state is playing then
						set currentvolume to the sound volume
						set sound volume to 30
						
						say "In order to use this aktion you have to press space and enter the text you want to hear or use Instant Send to send text to this action. See help for more information on the Instant Send feature. Enjoy!" using "Samantha" speaking rate 220
						
						delay 0.5
						set the sound volume to currentvolume
					else
						say "In order to use this aktion you have to press space and enter the text you want to hear or use Instant Send to send text to this action. See help for more information on the Instant Send feature. Enjoy!" using "Samantha" speaking rate 220
					end if
				end tell
			else
				say "In order to use this aktion you have to press space and enter the text you want to hear or use Instant Send to send text to this action. See help for more information on the Instant Send feature. Enjoy!" using "Samantha" speaking rate 220
			end if
		end tell
	on error e
		tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
	end try
end run