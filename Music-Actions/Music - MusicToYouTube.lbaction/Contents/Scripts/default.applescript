(* 
Music - Search for Song on YouTube Action for LaunchBar
by Christian Bender (@ptujec)
2023-10-26

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run
	if appIsRunning("Music") then
		tell application "Music"
			
			if exists name of current track then
				set aTrack to the current track
				set aDescription to the name of aTrack
				
				if artist of aTrack is not "" then
					set aTitle to the artist of aTrack
					
					-- Stream
				else if artist of aTrack is "" then
					set aTitle to aDescription
					if current stream title is not missing value then
						set aDescription to current stream title as text
					else if current stream URL is not missing value then
						set aDescription to current stream URL as text
					else
						set aDescription to " " as text
					end if
				end if
				
				--- Notification
				tell application "Music"
					if exists name of current track then
						set aTrack to the current track
						set aDescription to the name of aTrack
						
						-- Stream
						if artist of aTrack is "" then
							set aTitle to aDescription
							if current stream title is not missing value then
								set aDescription to current stream title as text
							else if current stream URL is not missing value then
								set aDescription to current stream URL as text
							else
								set aDescription to aTitle
							end if
						end if
						
						set theq to aDescription & " " & aTitle as string
						
						tell application "Safari"
							open location "https://www.youtube.com/results?search_query=" & theq
							activate
						end tell
						
					end if
				end tell
				
			else
				tell application "LaunchBar" to display in notification center with title "Error!" subtitle "No name!"
			end if
		end tell
		
	else
		tell application "LaunchBar" to display in notification center with title "Error!" subtitle "Music not running"
	end if
	
end run

-- Check if application is running
on appIsRunning(appName)
	tell application "System Events" to (name of processes) contains appName
end appIsRunning