-- https://gist.github.com/275067/3acc381e6c830e059607f84aa9db31f4ed222290
-- by mfilej
--
-- changed to show rating 
-- better display for streams … espescially radio streaming  
-- by Ptujec
--
-- 2011-10-05
-- changed to convert image data to a tempory jpg file (due to changes of Music artwork image data)
-- with help of http://dougscripts.com/Music/scripts/ss.php?sp=savealbumartjpeg

-- Display the track if Music is running
--
-- 2012-11-08
-- removed Growl and added Notification Center support (via LaunchBar)
-- removed image section since Notification Center only allows the application icon
-- 
-- 2021-12-19
-- Some clean up


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
						
						-- rating 
						if loved of aTrack is true then
							set _loved to "
♥ "
						else
							set _loved to ""
						end if
						
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