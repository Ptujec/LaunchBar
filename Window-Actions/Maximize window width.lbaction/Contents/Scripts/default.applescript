# http://superuser.com/questions/331313/how-to-automagically-move-windows-between-monitors-with-one-keystroke
# https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
# https://forum.latenightsw.com/t/get-sizes-of-monitor-s-via-applescript/1351/10


# use AppleScript version "2.4" -- Yosemite (10.10) or later
use framework "Foundation"
use framework "AppKit"
use scripting additions

set allFrames to (current application's NSScreen's screens()'s valueForKey:"frame") as list
set _mon1 to item 2 of item 1 of allFrames

set _w to item 1 of _mon1

try
	tell application "System Events"
		tell (first process whose frontmost is true)
			set _size to size of window 1
			set _h to item 2 of _size
			set _pos to position of window 1
			set _y to item 2 of _pos
			set position of window 1 to {0, _y}
			set size of window 1 to {_w, _h}
		end tell
	end tell
end try