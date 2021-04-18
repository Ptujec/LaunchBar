# http://superuser.com/questions/331313/how-to-automagically-move-windows-between-monitors-with-one-keystroke
# https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
# https://forum.latenightsw.com/t/get-sizes-of-monitor-s-via-applescript/1351/10

---
set _percentWidth to 55 # set percentage relative to screen size
set _percentHight to 75 # set percentage relative to screen size

set _scaleWindowWidth to _percentWidth / 100
set _scaleWindowHight to _percentHight / 100
---


# use AppleScript version "2.4" -- Yosemite (10.10) or later
use framework "Foundation"
use framework "AppKit"
use scripting additions

set allFrames to (current application's NSScreen's screens()'s valueForKey:"frame") as list
try
	set _mon1 to item 2 of item 1 of allFrames
	set _mon2 to item 2 of item 2 of allFrames
	
	set _mon1Width to item 1 of _mon1
	set _mon1Hight to item 2 of _mon1
	set _mon1Size to _mon1Width + _mon1Hight
	
	set _mon2Width to item 1 of _mon2
	set _mon2Hight to item 2 of _mon2
	set _mon2Size to _mon2Width + _mon2Hight
	
	tell current application to set _hightoffset to do shell script "/usr/libexec/PlistBuddy -c 'Print :DisplayAnyUserSets:Configs:0:0:CurrentInfo:OriginY ' /Library/Preferences/com.apple.windowserver.displays.plist"
	set _hightoffset to _hightoffset as feet as number
	
	tell current application to set _widthoffset to do shell script "/usr/libexec/PlistBuddy -c 'Print :DisplayAnyUserSets:Configs:0:0:CurrentInfo:OriginX ' /Library/Preferences/com.apple.windowserver.displays.plist"
	set _widthoffset to _widthoffset as feet as number
	
	set _mon1centerX to _mon1Width / 2
	set _mon1centerY to (_mon1Hight / 2) + 12.5 # half of menubar hight
	
	set _mon2centerX to _mon2Width / 2
	set _mon2centerY to (_mon2Hight / 2) + 12.5
	
	set _mon1_windowWidth to _mon1Width * _scaleWindowWidth
	set _mon1_windowHight to _mon1Hight * _scaleWindowHight
	
	set _mon2_windowWidth to _mon2Width * _scaleWindowWidth
	set _mon2_windowHight to _mon2Hight * _scaleWindowHight
	
	set _mon1_windowPosX to _mon1centerX - (_mon1_windowWidth / 2)
	set _mon1_windowPosY to _mon1centerY - (_mon1_windowHight / 2)
	
	set _mon2_windowPosX to _mon2centerX - (_mon2_windowWidth / 2) + _widthoffset
	set _mon2_windowPosY to _mon2centerY - (_mon2_windowHight / 2) + _hightoffset
	
	
	# detect position of the second screen in relation to the main screen
	if _mon1Width = _widthoffset then
		# say "Rechts"
		set _right to true
	else if _mon1Hight = _hightoffset then
		set _right to false
		set _bottom to true
	else if _mon2Width = -_widthoffset then
		set _right to false
		set _bottom to false
		set _left to true
	else if _mon2Hight = -_hightoffset then
		set _right to false
		set _bottom to false
		set _left to false
		set _top to true
	end if
	
	
end try

delay 0.01

try
	tell application "System Events"
		tell (first process whose frontmost is true)
			set _windowPos to position of window 1
			set x to item 1 of _windowPos # x = position width 
			set y to item 2 of _windowPos # y = position hight 
			
			
			if _right is true then # second screen positioned to the right			
				if x < _mon1Width then # width of monitor 1
					set _winLocation to "mon1"
					set _newSize to {_mon2_windowWidth, _mon2_windowHight}
					set _newPosition to {_mon2_windowPosX, _mon2_windowPosY}
				else
					set _winLocation to "mon2"
					set _newPosition to {_mon1_windowPosX, _mon1_windowPosY}
					set _newSize to {_mon1_windowWidth, _mon1_windowHight}
				end if
			else if _bottom is true then
				if y < _mon1Hight then # hight of monitor 1
					set _winLocation to "mon1"
					set _newSize to {_mon2_windowWidth, _mon2_windowHight}
					set _newPosition to {_mon2_windowPosX, _mon2_windowPosY}
				else
					set _winLocation to "mon2"
					set _newPosition to {_mon1_windowPosX, _mon1_windowPosY}
					set _newSize to {_mon1_windowWidth, _mon1_windowHight}
				end if
			else if _left is true then
				if x > -1 then
					set _winLocation to "mon1"
					set _newSize to {_mon2_windowWidth, _mon2_windowHight}
					set _newPosition to {_mon2_windowPosX, _mon2_windowPosY}
				else
					set _winLocation to "mon2"
					set _newPosition to {_mon1_windowPosX, _mon1_windowPosY}
					set _newSize to {_mon1_windowWidth, _mon1_windowHight}
				end if
			else if _top is true then
				if y < 25 then # hight of monitor 1
					set _winLocation to "mon2"
					set _newPosition to {_mon1_windowPosX, _mon1_windowPosY}
					set _newSize to {_mon1_windowWidth, _mon1_windowHight}
				else
					set _winLocation to "mon1"
					set _newSize to {_mon2_windowWidth, _mon2_windowHight}
					set _newPosition to {_mon2_windowPosX, _mon2_windowPosY}
				end if
			end if
			# checking for window loaction and whether the monitor it is located on is bigger or smaller than the other one 
			if _winLocation is "mon1" then
				if _mon1Size > _mon2Size then
					set size of window 1 to _newSize
					set position of window 1 to _newPosition
				else
					set position of window 1 to _newPosition
					set size of window 1 to _newSize
				end if
				
			else
				if _mon2Size > _mon1Size then
					set size of window 1 to _newSize
					set position of window 1 to _newPosition
				else
					set position of window 1 to _newPosition
					set size of window 1 to _newSize
				end if
			end if
			
		end tell
	end tell
end try