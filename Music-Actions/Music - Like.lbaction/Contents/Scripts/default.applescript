-- Music - Like for LaunchBar by Christian Bender @ptujec

on run
	-- check os version 
	set os_version to system version of (system info)
	set os_version_main to item 1 of os_version & item 2 of os_version
	
	like(os_version_main)
end run

on getState(os_version_main)
	tell application "Music"
		if os_version_main as number < 14 then
			set l to loved of the current track
		else
			set l to favorited of the current track
		end if
	end tell
	
	set _local to user locale of (get system info)
	-- set _local to "en"
	
	if _local starts with "de" then
		set _title_on to "Mag ich"
		set _sub_on to "Nicht mehr?"
		set _title_off to "Mag ich nicht"
		set _sub_off to "Doch?"
	else
		set _title_on to "Liked"
		set _sub_on to "Dislike?"
		set _title_off to "Disliked"
		set _sub_off to "Like?"
	end if
	
	if l is true then
		set output to {title:_title_on, subtitle:_sub_on, action:"dislike", actionArgument:os_version_main, icon:"likeTemplate"}
	else
		set output to {title:_title_off, subtitle:_sub_off, action:"like", actionArgument:os_version_main, icon:"dislikeTemplate"}
	end if
end getState

on like(os_version_main)
	if os_version_main as number < 14 then
		tell application "Music" to set loved of the current track to true
	else
		tell application "Music" to set favorited of the current track to true
	end if
	getState(os_version_main)
end like


on dislike(os_version_main)
	if os_version_main as number < 14 then
		tell application "Music" to set loved of the current track to false
	else
		tell application "Music" to set favorited of the current track to false
	end if
	getState(os_version_main)
end dislike