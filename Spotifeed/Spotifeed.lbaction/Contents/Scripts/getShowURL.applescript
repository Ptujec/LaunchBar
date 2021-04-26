#	https://macscripter.net/viewtopic.php?pid=176648#p176648

tell application "Safari"
	try
		set w to 1st window whose name contains "Podcast on Spotify"
		#set visible of w to false
		#set visible of w to true
		set index of w to 1
		
		
		set _URL to URL of front document
	end try
	return _URL
end tell