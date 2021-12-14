-- Music - Like for LaunchBar by Christian Bender @ptujec

on run
	like()
end run

on getState()
	tell application "Music"
		set l to loved of the current track
	end tell
	
	set _local to user locale of (get system info)
	-- set _local to "en"
	
	if _local starts with "de" then
		set _title_on to "Gefällt mir"
		set _sub_on to "Nicht mehr?"
		set _title_off to "Gefällt mir nicht"
		set _sub_off to "Doch?"
	else
		set _title_on to "Liked"
		set _sub_on to "Dislike?"
		set _title_off to "Disliked"
		set _sub_off to "Like?"
	end if
	
	if l is true then
		set output to {title:_title_on, subtitle:_sub_on, action:"dislike", icon:"likeTemplate"}
	else
		set output to {title:_title_off, subtitle:_sub_off, action:"like", icon:"dislikeTemplate"}
	end if
end getState

on like()
	tell application "Music" to set loved of the current track to true
	getState()
end like


on dislike()
	tell application "Music" to set loved of the current track to false
	getState()
end dislike