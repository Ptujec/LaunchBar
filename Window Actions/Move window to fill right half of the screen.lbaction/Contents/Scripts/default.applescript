# Fenster rechte HŠlfte

# use AppleScript version "2.4" -- Yosemite (10.10) or later
use framework "Foundation"
use framework "AppKit"
use scripting additions

set allFrames to (current application's NSScreen's screens()'s valueForKey:"frame") as list
set _mon1 to item 2 of item 1 of allFrames

set _mon1Width to item 1 of _mon1
set _mon1Hight to item 2 of _mon1

set _wW to _mon1Width / 2
set _wH to _mon1Hight - 25
set _x to _mon1Width / 2

delay 0.01

try
	tell application "System Events"
		tell (first process whose frontmost is true)
			
			
			set position of window 1 to {_x, 25}
			set size of window 1 to {_wW, _wH}
		end tell
	end tell
	
end try
