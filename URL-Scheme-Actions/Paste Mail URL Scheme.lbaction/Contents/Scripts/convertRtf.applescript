on run (s)
	set s to s as string
	-- display dialog s 
	do shell script "echo " & quoted form of s & "|textutil -inputencoding UTF-8 -format html  -convert rtf -stdin -stdout|LC_CTYPE=UTF-8 pbcopy"
	
	tell application "LaunchBar" to hide
	
	delay 0.1
	tell application "System Events"
		keystroke "v" using command down
	end tell
end run
