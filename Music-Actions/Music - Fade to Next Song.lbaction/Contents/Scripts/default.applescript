(* 
  db iTunes Fade-in/out
  By David Battino, Batmosphere.com
  Based on ideas from Doug's AppleScripts and Mac OS Hints
  
  This script fades out iTunes if it's playing and fades it in if it's stopped.
*)

-- edited by Ptujec
--
-- 2015-05-22
-- Instead of Play and Pause this jumps to the next song after the current song fades out. If nothing is playing it fades in.
# 2021-02-20
# Fixed an issue where the next song would not actually play or be silent. Also if nothing is playing nothing is happening É the action doesn't make sense if nothing is playing 

try
	tell application "Music"
		set currentvolume to the sound volume
		if player state is playing then
			repeat
				--Fade down	
				repeat with i from currentvolume to 0 by -5 --try by -4 on slower Macs
					set the sound volume to i
					delay 0.05 -- Adjust this to change fadeout duration (delete this line on slower Macs)
				end repeat
				pause
				--Restore original volume
				set the sound volume to currentvolume
				exit repeat
			end repeat
			next track
			play
		end if
		
	end tell
	
on error e
	tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
end try