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

# set _screenWar to (1440 / 1920) # war width adaption ratio of screen 1 & 2
set _screenWar to (_mon2Width / _mon1Width) # war width adaption ratio of screen 1 & 2

# set _screenHar to (900 / 1200) # war hight adaption ratio of screen 1 & 2 
set _screenHar to (_mon2Hight / _mon1Hight) # war hight adaption ratio of screen 1 & 2 

delay 0.01 # attempt to fix the script not setting position hight currently É not sure that causes it É it's not consistent

try
	tell application "System Events"
		tell (first process whose frontmost is true)
			set _windowPos to position of window 1
			set x to item 1 of _windowPos # x = position width 
			set y to item 2 of _windowPos # y = position width 
			
			set _windowSize to size of window 1
			set _windowWidth to (item 1 of _windowSize)
			set _windowHight to (item 2 of _windowSize)
			
			if x < 1920 then # 1920 width of monitor 1
				set position of window 1 to {(x * _screenWar) + 1920, ((y - 25) * _screenHar) + (_hightoffset + 25)} # menubar = 25 pixel
				set size of window 1 to {_windowWidth * _screenWar, _windowHight * _screenHar} # {1021, 728}
			else
				# set position of window 1 to {0, 25}
				set position of window 1 to {(x - 1920) / _screenWar, ((y - (_hightoffset + 25)) / _screenHar) + 25}
				set size of window 1 to {_windowWidth / _screenWar, _windowHight / _screenHar} # {1139, 790}
			end if
		end tell
	end tell
end try