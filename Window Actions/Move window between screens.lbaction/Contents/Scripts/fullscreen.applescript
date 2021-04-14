# http://superuser.com/questions/331313/how-to-automagically-move-windows-between-monitors-with-one-keystroke
# https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
# https://forum.latenightsw.com/t/get-sizes-of-monitor-s-via-applescript/1351/10

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
	
	set _mon2Width to item 1 of _mon2
	set _mon2Hight to item 2 of _mon2
	
	tell current application to set _hightoffset to do shell script "/usr/libexec/PlistBuddy -c 'Print :DisplayAnyUserSets:Configs:0:0:CurrentInfo:OriginY ' /Library/Preferences/com.apple.windowserver.displays.plist"
	set _hightoffset to _hightoffset as feet as number
	
	tell current application to set _widthoffset to do shell script "/usr/libexec/PlistBuddy -c 'Print :DisplayAnyUserSets:Configs:0:0:CurrentInfo:OriginX ' /Library/Preferences/com.apple.windowserver.displays.plist"
	set _widthoffset to _widthoffset as feet as number
	
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

try
	tell application "System Events"
		tell (first process whose frontmost is true)
			set _windowPos to position of window 1
			set x to item 1 of _windowPos # x = position width 
			set y to item 2 of _windowPos # y = position hight 
			
			if _right is true then # second screen positioned to the right		
				if x < _mon1Width then # width of monitor 1
					set _newPosition to {_mon1Width, (_hightoffset + 25)} # 25 = menubar hight
					set _newSize to {_mon2Width, (_mon2Hight - 25)}
				else
					set _newSize to {_mon1Width, _mon1Hight}
					set _newPosition to {0, 25}
				end if
			else if _bottom is true then
				if y < _mon1Hight then # hight of monitor 1
					set _newPosition to {_widthoffset, (_hightoffset + 25)} # 25 = menubar hight
					set _newSize to {_mon2Width, (_mon2Hight - 25)}
				else
					set _newPosition to {0, 25}
					set _newSize to {_mon1Width, _mon1Hight}
				end if
			else if _left is true then
				if x > -1 then
					set _newPosition to {_widthoffset, (_hightoffset + 25)} # 25 = menubar hight
					set _newSize to {_mon2Width, (_mon2Hight - 25)}
				else
					set _newPosition to {0, 25}
					set _newSize to {_mon1Width, _mon1Hight}
				end if
			else if _top is true then
				if y < 25 then # hight of monitor 1
					set _newPosition to {0, 25}
					set _newSize to {_mon1Width, _mon1Hight}
				else
					set _newPosition to {_widthoffset, (_hightoffset + 25)} # 25 = menubar hight
					set _newSize to {_mon2Width, (_mon2Hight - 25)}
				end if
			end if
			
			# setting the position before size should always lead to the correct result 
			set position of window 1 to _newPosition
			set size of window 1 to _newSize
		end tell
	end tell
end try