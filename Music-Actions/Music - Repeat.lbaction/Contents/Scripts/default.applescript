(* 
Music - Repeat Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run
	repeat_all()
end run

on getState()
	set _local to user locale of (get system info)
	-- set _local to "en"
	
	if _local starts with "en" then
		set _sub to "Ändern mit ↩"
		set _repeat_all to "Alle wiederholen"
		set _repeat_one to "Eins wiederholen"
		set _repeat_off to "Wiederholen aus"
	else
		set _sub to "Change with ↩"
		set _repeat_all to "Repeat all"
		set _repeat_one to "Repeat one"
		set _repeat_off to "Repeat off"
	end if
	
	tell application "Music"
		if song repeat is all then
			set output to {title:_repeat_all, subtitle:_sub, action:"repeat_one", icon:"iconTemplate"}
		else if song repeat is one then
			set output to {title:_repeat_one, subtitle:_sub, action:"repeat_off", icon:"icon1Template"}
		else if song repeat is off then
			set output to {title:_repeat_off, subtitle:_sub, action:"repeat_all", icon:"icon2Template"}
		end if
	end tell
end getState

on repeat_all()
	tell application "Music" to set song repeat to all
	getState()
end repeat_all


on repeat_one()
	tell application "Music" to set song repeat to one
	getState()
end repeat_one

on repeat_off()
	tell application "Music" to set song repeat to off
	getState()
end repeat_off
