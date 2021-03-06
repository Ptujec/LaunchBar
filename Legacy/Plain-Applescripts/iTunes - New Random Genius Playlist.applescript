-- Play New Random Genius Playlist in iTunes by Ptujec
-- The script will use a random song as the basis for a new genius playlist. 
-- See http://ptujec.tumblr.com/post/2874324070/itunes-new-random-genius-playlist-script for more information
--
-- source: http://www.macosxhints.com/article.php?story=20090805072808180
-- last edited 2011-10-05
--
-- !!! Mac sure the playlist name is right (engl.: "Music", ger.: "Musik")  !!!
--
-- 2012-11-08
-- removed Growl and added Notification Center support (via LaunchBar)


tell application "iTunes"
	try
		repeat
			set aTrack to some track of playlist "Musik" whose shufflable is true
			if video kind of aTrack is none then exit repeat
		end repeat
		
		play aTrack
		activate -- window 1
		reveal aTrack
		tell current playlist to set shuffle to true
		
		
		my _action()
		
		tell application "System Events" to set visible of process "iTunes" to false
		
		set aDescription to the name of aTrack
		set aTitle to the artist of aTrack
		
		-- rating 
		if rating of aTrack is 100 then
			set rating_ to " ★★★★★"
			-- else if rating of aTrack is 80 then
			--	set rating_ to " ★★★★"
		else if rating of aTrack is 60 then
			set rating_ to " ★★★・・"
			-- else if rating of aTrack is 40 then
			--	set rating_ to " ★★・・・"
			-- else if rating of aTrack is 20 then
			--	set rating_ to " ★・・・・"
		else
			set rating_ to " "
		end if
		
		
		tell application "LaunchBar" to display in notification center with title aDescription & " " & rating_ subtitle aTitle
		
		
	on error e
		tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
	end try
	
end tell

-- Genius (Ui Scripting)
on _action()
	
	tell application "System Events"
		
		tell process "iTunes"
			repeat with the_button in every button of window 1
				set the_props to properties of the_button
				if description of the_props is "genius" then
					click the_button
					-- return
				end if
			end repeat
		end tell
	end tell
	
end _action