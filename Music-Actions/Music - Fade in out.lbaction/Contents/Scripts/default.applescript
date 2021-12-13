(* 
  db iTunes Fade-in/out
  By David Battino, Batmosphere.com
  Based on ideas from Doug's AppleScripts and Mac OS Hints
  
  This script fades out iTunes if it's playing and fades it in if it's stopped.
*)

-- edited by Ptujec
--
-- 2012-11-08
-- + show rating
-- + display info also for streams and podcasts
-- + Notification Center support (via LaunchBar)

-- 2014-06-19
-- - removed Notifications because iTunes is doing this now out of the box
-- + some cleanup for LB6

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
		else -- if player state is paused then
			
			set the sound volume to 0 --2007-03-20 script update to fix startup glitch
			play
			
			-- tell application "System Events" to set visible of process "iTunes" to false
			
			-- reveal current track
			
			repeat with j from 0 to currentvolume by 5 --try by 4 on slower Macs
				set the sound volume to j
				delay 0.05 -- Adjust this to change fadeout duration (delete this line on slower Macs)	
			end repeat
		end if
	end tell
	
on error e
	tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
end try