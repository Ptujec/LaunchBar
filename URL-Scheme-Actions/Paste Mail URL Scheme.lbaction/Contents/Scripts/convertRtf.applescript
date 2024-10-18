(* 
Convert HTML to RTF and paste to current text position 
by Christian Bender (@ptujec)
2024-10-18

See default.js for sources

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run (s)
	set s to s as string

	do shell script "echo " & quoted form of s & "|textutil -inputencoding UTF-8 -format html  -convert rtf -stdin -stdout|LC_CTYPE=UTF-8 pbcopy"
	
	tell application "LaunchBar" to hide
	
	delay 0.1
	
	tell application "System Events"
		keystroke "v" using command down
	end tell
end run
