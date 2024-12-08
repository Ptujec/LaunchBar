(* 
New Text File Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-06

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on handle_string(_name)	
	tell application "Finder"
		activate
		if exists Finder window 1 then
			set currentDir to target of Finder window 1 as alias
		else
			set currentDir to desktop as alias
		end if
	end tell
	
	set _path to POSIX path of currentDir & _name
	do shell script "touch '" & _path & "'"
	-- do shell script "touch '" & _path & "' && open '" & _path & "'"
	tell application "LaunchBar" to set selection to _path
end handle_string