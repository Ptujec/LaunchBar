# http://superuser.com/questions/331313/how-to-automagically-move-windows-between-monitors-with-one-keystroke
# https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
# https://forum.latenightsw.com/t/get-sizes-of-monitor-s-via-applescript/1351/10


# use AppleScript version "2.4" -- Yosemite (10.10) or later
use framework "Foundation"
use framework "AppKit"
use scripting additions

set allFrames to (current application's NSScreen's screens()'s valueForKey:"frame") as list
set _mon1 to item 2 of item 1 of allFrames

set _mon1Width to item 1 of _mon1
set _mon1Hight to item 2 of _mon1

set _mon1centerX to _mon1Width / 2
set _mon1centerY to (_mon1Hight / 2) + 12.5 # half of menubar hight

delay 0.01

try
	tell application "System Events"
		tell (first process whose frontmost is true)
			set _pos to position of window 1
			set _posX to item 1 of _pos
			set _posY to item 2 of _pos
			
			set _windowSize to size of window 1
			set _windowWidth to item 1 of _windowSize
			set _windowHight to item 2 of _windowSize
			
			set _windowPosX to _mon1centerX - (_windowWidth / 2)
			set _windowPosY to _mon1centerY - (_windowHight / 2)
			
			set position of window 1 to {_windowPosX, _windowPosY}
		end tell
	end tell
	
end try
