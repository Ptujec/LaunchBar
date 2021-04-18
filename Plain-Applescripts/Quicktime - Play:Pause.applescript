-- check if iTunes is running 
-- Pause iTunes if playing

tell application "System Events"
	if process "iTunes" exists then
		set okflag to true --iTunes is running
	else
		set okflag to false
	end if
end tell

if okflag is true then
	tell application "iTunes"
		set currentvolume to the sound volume
		if player state is playing then
			repeat
				--Fade down	
				repeat with i from currentvolume to 0 by -1 --try by -4 on slower Macs
					set the sound volume to i
					delay 0.01 -- Adjust this to change fadeout duration (delete this line on slower Macs)
				end repeat
				pause
				--Restore original volume
				set the sound volume to currentvolume
				exit repeat
			end repeat
		end if
	end tell
end if

-- Toggle Quicktime 

tell application "QuickTime Player"
	if document 1 is playing then
		pause document 1
		tell application "Finder" to activate
	else
		activate
		present document 1
		play document 1
	end if
end tell

