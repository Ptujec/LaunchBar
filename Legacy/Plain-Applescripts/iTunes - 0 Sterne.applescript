-- iTunes - Rate (for current track playing)
-- @Ptujec 2010-09-07
-- updated 2012-11-08 (Notification Center/LaunchBar)


tell application "iTunes"
	if player state is playing then
		set okflag to true
	else
		set okflag to false
	end if
end tell


if okflag is true then
	_rate()
	
else if okflag is false then
	tell application "LaunchBar" to display in notification center with title "Error!" subtitle "iTunes is not playing ..."
	
end if


-- the actuall work
on _rate()
	tell application "iTunes"
		set aTrack to the current track
		set aName to the name of aTrack
		set aArtist to the artist of aTrack
		if artist of aTrack is not "" then
			set aArtist to the artist of aTrack
		else if artist of aTrack is "" then
			set aArtist to aName
		end if
		
		set rating of aTrack to 0
		
		
		tell application "LaunchBar" to display in notification center with title "»" & aName & "« by " & aArtist subtitle "Rating is ・・・・・"
	end tell
end _rate