on run
	set _local to user locale of (get system info)
	-- set _local to "en"
	
	if _local starts with "de" then
		set _title_on to "Zufällige Wiedergabe ist an"
		set _sub_on to ""
		set _title_off to "Zufällige Wiedergabe ist aus"
		set _sub_off to ""
	else
		set _title_on to "Shuffle is on"
		set _sub_on to "Hit Enter to turn it off"
		set _title_off to "Shuffle is off"
		set _sub_off to "Hit Enter to turn it on"
	end if
	
	tell application "Music"
		if shuffle enabled is true then
			set output to {title:_title_on, subtitle:_sub_on, action:"shuffle_off", icon:"Template"}
		else
			set output to {title:_title_off, subtitle:_sub_off, action:"shuffle_on", icon:"offTemplate"}
		end if
	end tell
	
	return output
	
end run

on shuffle_on()
	set _local to user locale of (get system info)
	
	if _local starts with "de" then
		set _title_on to "Zufällige Wiedergabe ist an"
		set _sub_on to ""
		set _title_off to "Zufällige Wiedergabe ist aus"
		set _sub_off to ""
	else
		set _title_on to "Shuffle is on"
		set _sub_on to "Hit Enter to turn it off"
		set _title_off to "Shuffle is off"
		set _sub_off to "Hit Enter to turn it on"
	end if
	tell application "Music" to set shuffle enabled to true
	set output to {title:_title_on, subtitle:_sub_on, action:"shuffle_off", icon:"Template"}
	return output
end shuffle_on

on shuffle_off()
	set _local to user locale of (get system info)
	
	if _local starts with "de" then
		set _title_on to "Zufällige Wiedergabe ist an"
		set _sub_on to ""
		set _title_off to "Zufällige Wiedergabe ist aus"
		set _sub_off to ""
	else
		set _title_on to "Shuffle is on"
		set _sub_on to "Hit Enter to turn it off"
		set _title_off to "Shuffle is off"
		set _sub_off to "Hit Enter to turn it on"	
	end if
	tell application "Music" to set shuffle enabled to false
	set output to {title:_title_off, subtitle:_sub_off, action:"shuffle_on", icon:"offTemplate"}
	return output
end shuffle_off