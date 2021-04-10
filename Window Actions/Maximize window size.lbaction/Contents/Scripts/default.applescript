# http://superuser.com/questions/331313/how-to-automagically-move-windows-between-monitors-with-one-keystroke
# https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
# https://forum.latenightsw.com/t/get-sizes-of-monitor-s-via-applescript/1351/10

---
set _percentWidth to 50 # set percentage relative to screen size
set _percentHight to 65 # set percentage relative to screen size

set _scaleWindowWidth to _percentWidth / 100
set _scaleWindowHight to _percentHight / 100
---


# use AppleScript version "2.4" -- Yosemite (10.10) or later
use framework "Foundation"
use framework "AppKit"
use scripting additions

set allFrames to (current application's NSScreen's screens()'s valueForKey:"frame") as list
set _mon1 to item 2 of item 1 of allFrames

set _mon1Width to item 1 of _mon1
set _mon1Hight to item 2 of _mon1

delay 0.01

try
	tell application "System Events"
		tell (first process whose frontmost is true)
			
			set position of window 1 to {0, 25}
			set size of window 1 to {_mon1Width, _mon1Hight}
			
		end tell
	end tell
	
end try