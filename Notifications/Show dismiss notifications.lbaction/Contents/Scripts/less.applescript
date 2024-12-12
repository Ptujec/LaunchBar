(* 
Show less notifications Applescript Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15
requires macOS 15.2

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Helpful:
- https://applehelpwriter.com/2016/08/09/applescript-get-item-number-of-list-item/
- https://www.macscripter.net/t/coerce-gui-scripting-information-into-string/62842
- https://forum.keyboardmaestro.com/t/understanding-applescript-ui-scripting-to-click-menus/29039/23?page=2
*)

use AppleScript version "2.4" -- Yosemite (10.10) or later
use scripting additions
use framework "Foundation"
property NSArray : a reference to current application's NSArray
on run
	tell application "System Events"
		try
			set _main_group to group 1 of scroll area 1 of group 1 of group 1 of window 1 of application process "NotificationCenter"
		on error eStr number eNum
			display notification eStr with title "Error " & eNum sound name "Frog"
			return
		end try
		
		set _headings to UI elements of _main_group whose role is "AXHeading"
		
		set _headingscount to count of _headings
	end tell
	
	repeat _headingscount times
		tell application "System Events" to set _roles to role of UI elements of _main_group
		set _headingIndex to its getIndexOfItem:"AXHeading" inList:_roles
		set _closeButtonIndex to _headingIndex + 1
		tell application "System Events" to click item _closeButtonIndex of UI elements of _main_group
		delay 0.4
	end repeat
	
	tell application "LaunchBar" to activate
end run

on getIndexOfItem:anItem inList:aList
	set anArray to NSArray's arrayWithArray:aList
	set ind to ((anArray's indexOfObject:anItem) as number) + 1
	if ind is greater than (count of aList) then
		display dialog "Item '" & anItem & "' not found in list." buttons "OK" default button "OK" with icon 2 with title "Error"
		return 0
	else
		return ind
	end if
end getIndexOfItem:inList:
