# http://superuser.com/questions/331313/how-to-automagically-move-windows-between-monitors-with-one-keystroke
# https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
# https://forum.latenightsw.com/t/get-sizes-of-monitor-s-via-applescript/1351/10

---

# use AppleScript version "2.4" -- Yosemite (10.10) or later
use framework "Foundation"
use framework "AppKit"
use scripting additions

set allFrames to (current application's NSScreen's screens()'s valueForKey:"frame") as list
set _mon1 to item 2 of item 1 of allFrames
set _mon2 to item 2 of item 2 of allFrames

set _mon1Width to item 1 of _mon1
set _mon1Hight to item 2 of _mon1

set _mon2Width to item 1 of _mon2
set _mon2Hight to item 2 of _mon2

# set _hightoffset to _mon1Hight - _mon2Hight
tell current application to set _hightoffset to do shell script "/usr/libexec/PlistBuddy -c 'Print :DisplayAnyUserSets:Configs:0:0:CurrentInfo:OriginY ' /Library/Preferences/com.apple.windowserver.displays.plist"
set _hightoffset to _hightoffset as feet as number



delay 0.01

try
	tell application "System Events"
		tell (first process whose frontmost is true)
			set _pos to position of window 1
			set x to item 1 of _pos
			if x < _mon1Width then
				set position of window 1 to {_mon1Width, (_hightoffset + 25)} # 25 = menubar hight
				set size of window 1 to {_mon2Width, (_mon2Hight - 25)}
			else
				set position of window 1 to {0, 25}
				set size of window 1 to {_mon1Width, _mon1Hight}
			end if
		end tell
	end tell
end try