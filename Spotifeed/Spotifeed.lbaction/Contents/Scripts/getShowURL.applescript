-- Get Spotify "Podcast" URL - Ptujec 2021-04-27
-- https://macscripter.net/viewtopic.php?pid=176648#p176648

tell application "Safari"
	try
		set w to 1st window whose name contains "Podcast on Spotify"
		set index of w to 1
		set _URL to URL of front document
		return _URL
	on error (e)
		return e
	end try
end tell