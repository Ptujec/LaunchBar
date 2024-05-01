(* 
Duplicate and Arrange Windows Action for LaunchBar
by Christian Bender (@ptujec)
2024-05-01

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Helpful Info for getting applications in the order they are listed in the appswitcher:
- https://www.macscripter.net/t/second-frontmost-application/73701/24
*)

use framework "Foundation"
use framework "AppKit"
use scripting additions

tell application "Finder"
	set currentfolder to target of window 1
	set clonedwindow to make new Finder window to currentfolder
end tell

tell application "System Events"
	-- Dock size 
	tell application process "Dock" to set {dock_width, dock_height} to the size of list 1
	
	set _dock_size_side to 0
	set _dock_size_bottom to 0
	
	tell dock preferences
		set _autohide to autohide
		set _dock_position to screen edge
	end tell
	
	if _autohide is false then
		if _dock_position is in {left, right} then
			set _dock_size_side to dock_width + 7
		else
			set _dock_size_bottom to dock_height + 7
		end if
	end if
	
	-- Screen dimensions
	set allFrames to (current application's NSScreen's screens()'s valueForKey:"frame") as list
	set _mon1 to item 2 of item 1 of allFrames
	
	set _mon1Width to item 1 of _mon1
	set _mon1Hight to item 2 of _mon1
	
	set _wW to round ((_mon1Width - _dock_size_side) / 2) rounding down
	set _wW2 to _wW
	
	-- display dialog (_wW + _wW2 + _dock_size_side + 1)
	
	if (_wW + _wW2 + _dock_size_side + 1) > _mon1Width then
		set _wW2 to (_wW - 1)
	end if
	
	-- display dialog (_wW + _wW2 + _dock_size_side + 1)
	
	set _wH to (_mon1Hight - _dock_size_bottom) - 25
	
	set _x to 0
	set _x2 to _wW + 1
	
	if _dock_position is left then
		set _x to _dock_size_side
		set _x2 to _x2 + _dock_size_side
	end if
	
	set _apps to the paragraphs of (do shell script "lsappinfo metainfo |
				tail -1 | grep -Eo '\"[^\"]+\"' | tr -d '\"'")
	
	set _window_apps to {}
	set _total_window_count to 0
	
	repeat with _app in _apps
		if visible of application process _app is true then
			set _windows to windows of application process _app
			if _windows is not {} then
				set end of _window_apps to name of application process _app
				set _window_count to count _windows
				set _total_window_count to _total_window_count + _window_count
			else
				set visible of application process _app to false
			end if
		end if
	end repeat
end tell

try
	set _first to item 1 of _window_apps
	set _second to item 2 of _window_apps
end try

if _total_window_count is 0 then
	display dialog "No windows!"
	return
else if _total_window_count is 1 then
	display dialog "There is only 1 visible window."
	return
end if

tell application "System Events"
	
	tell application process _first
		set _count to count windows
		-- delay 0.1
		if _count > 1 then
			
			set position of window 1 to {_x, 25}
			set size of window 1 to {_wW, _wH}
			
			set position of window 2 to {_x2, 25}
			set size of window 2 to {_wW2, _wH}
			
		else if _count is 1 then
			set position of window 1 to {_x, 25}
			set size of window 1 to {_wW, _wH}
			
			tell application "System Events" to tell application process _second
				set position of window 1 to {_x2, 25}
				set size of window 1 to {_wW2, _wH}
			end tell
		end if
		
	end tell
	
end tell