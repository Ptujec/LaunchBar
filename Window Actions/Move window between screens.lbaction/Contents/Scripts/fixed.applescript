# http://superuser.com/questions/331313/how-to-automagically-move-windows-between-monitors-with-one-keystroke
# https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
# https://forum.latenightsw.com/t/get-sizes-of-monitor-s-via-applescript/1351/10

---
set _percentWidth to 55 # set percentage relative to screen size
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
set _mon2 to item 2 of item 2 of allFrames

set _mon1Width to item 1 of _mon1
set _mon1Hight to item 2 of _mon1

set _mon2Width to item 1 of _mon2
set _mon2Hight to item 2 of _mon2

# set _hightoffset to _mon1Hight - _mon2Hight
tell current application to set _hightoffset to do shell script "/usr/libexec/PlistBuddy -c 'Print :DisplayAnyUserSets:Configs:0:0:CurrentInfo:OriginY ' /Library/Preferences/com.apple.windowserver.displays.plist"
set _hightoffset to _hightoffset as feet as number


set _mon1centerX to _mon1Width / 2
set _mon1centerY to (_mon1Hight / 2) + 12.5 # half of menubar hight

set _mon2centerX to _mon2Width / 2
set _mon2centerY to (_mon2Hight / 2) + 12.5

set _mon1_windowWidth to _mon1Width * _scaleWindowWidth
set _mon1_windowHight to _mon1Hight * _scaleWindowHight

set _mon1_windowPosX to _mon1centerX - (_mon1_windowWidth / 2)
set _mon1_windowPosY to _mon1centerY - (_mon1_windowHight / 2)

set _mon2_windowWidth to _mon2Width * _scaleWindowWidth
set _mon2_windowHight to _mon2Hight * _scaleWindowHight

set _mon2_windowPosX to _mon2centerX - (_mon2_windowWidth / 2) + _mon1Width
set _mon2_windowPosY to _mon2centerY - (_mon2_windowHight / 2) + _hightoffset


delay 0.01

try
	tell application "System Events"
		tell (first process whose frontmost is true)
			set _pos to position of window 1
			set x to item 1 of _pos
			
			if x < _mon1Width then # 
				set position of window 1 to {_mon2_windowPosX, _mon2_windowPosY} # {2104, 398}
				set size of window 1 to {_mon2_windowWidth, _mon2_windowHight} # {1072, 730}
			else
				set position of window 1 to {_mon1_windowPosX, _mon1_windowPosY} # {391, 218}
				set size of window 1 to {_mon1_windowWidth, _mon1_windowHight} # {1139, 790}
			end if
		end tell
	end tell
	
end try