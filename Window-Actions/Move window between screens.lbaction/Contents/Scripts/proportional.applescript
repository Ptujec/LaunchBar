# http://superuser.com/questions/331313/how-to-automagically-move-windows-between-monitors-with-one-keystroke
# https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
# https://forum.latenightsw.com/t/get-sizes-of-monitor-s-via-applescript/1351/10

---
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
	
	set _screenWar to (_mon2Width / _mon1Width) # width adaption ratio of screen 1 & 2
	set _screenHar to (_mon2Hight / _mon1Hight) #  hight adaption ratio of screen 1 & 2 
	
	tell current application to set _hightoffset to do shell script "/usr/libexec/PlistBuddy -c 'Print :DisplayAnyUserSets:Configs:0:DisplayConfig:0:CurrentInfo:OriginY ' /Library/Preferences/com.apple.windowserver.displays.plist"
	set _hightoffset to _hightoffset as feet as number
	
	tell current application to set _widthoffset to do shell script "/usr/libexec/PlistBuddy -c 'Print :DisplayAnyUserSets:Configs:0:DisplayConfig:0:CurrentInfo:OriginX ' /Library/Preferences/com.apple.windowserver.displays.plist"
	set _widthoffset to _widthoffset as feet as number
	
	# detect position of the second screen in relation to the main screen
	if _mon1Width = _widthoffset then
		#say "Rechts"
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

try
	tell application "System Events"
		tell (first process whose frontmost is true)
			set _windowPos to position of window 1
			set x to item 1 of _windowPos # x = position width 
			set y to item 2 of _windowPos # y = position hight 
			
			set _windowSize to size of window 1
			set _windowWidth to (item 1 of _windowSize)
			set _windowHight to (item 2 of _windowSize)
			
			
			# set current location (which monitor) of the frontmost window and new window size and postion 
			if _right is true then
				if x < _mon1Width then
					set _newSize to {_windowWidth * _screenWar, _windowHight * _screenHar}
					set _newPosition to {(x * _screenWar) + _widthoffset, ((y - 25) * _screenHar) + (_hightoffset + 25)} # menubar = 25 pixel
					set _winLocation to "mon1"
				else
					set _newPosition to {(x - _widthoffset) / _screenWar, ((y - (_hightoffset + 25)) / _screenHar) + 25}
					set _newSize to {_windowWidth / _screenWar, _windowHight / _screenHar}
					set _winLocation to "mon2"
				end if
				
			else if _bottom is true then
				if y < _mon1Hight then
					set _newPosition to {(x * _screenWar) + _widthoffset, ((y - 25) * _screenHar) + (_hightoffset + 25)}
					set _newSize to {_windowWidth * _screenWar, _windowHight * _screenHar}
					set _winLocation to "mon1"
				else
					set _newPosition to {(x - _widthoffset) / _screenWar, ((y - (_hightoffset + 25)) / _screenHar) + 25}
					set _newSize to {_windowWidth / _screenWar, _windowHight / _screenHar}
					set _winLocation to "mon2"
				end if
			else if _left is true then
				if x > -1 then
					set _newSize to {_windowWidth * _screenWar, _windowHight * _screenHar}
					set _newPosition to {(x * _screenWar) + _widthoffset, ((y - 25) * _screenHar) + (_hightoffset + 25)}
					set _winLocation to "mon1"
				else
					set _newPosition to {(x - _widthoffset) / _screenWar, ((y - (_hightoffset + 25)) / _screenHar) + 25}
					set _newSize to {_windowWidth / _screenWar, _windowHight / _screenHar}
					set _winLocation to "mon2"
				end if
			else if _top is true then
				if y < 25 then
					set _newPosition to {(x - _widthoffset) / _screenWar, (y + (-_hightoffset - 25)) / _screenHar + 25}
					set _newSize to {_windowWidth / _screenWar, (_windowHight + 25) / _screenHar - 25}
					set _winLocation to "mon2"
				else
					set _newSize to {_windowWidth * _screenWar, (_windowHight + 25) * _screenHar - 25}
					set _newPosition to {(x * _screenWar) + _widthoffset, ((y - 25) * _screenHar) + _hightoffset + 25}
					set _winLocation to "mon1"
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