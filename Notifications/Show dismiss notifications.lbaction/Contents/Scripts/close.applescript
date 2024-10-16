(* 
Close notifications Applescript Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15

requires macOS 15 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Helpful:
- https://applehelpwriter.com/2016/08/09/applescript-get-item-number-of-list-item/
- https://www.macscripter.net/t/coerce-gui-scripting-information-into-string/62842/3
- https://forum.keyboardmaestro.com/t/understanding-applescript-ui-scripting-to-click-menus/29039/23?page=2
*)

use AppleScript version "2.4" -- Yosemite (10.10) or later
use scripting additions
use framework "Foundation"
property NSArray : a reference to current application's NSArray
property closeActionSet : {"Close", "Clear All", "Schlie§en", "Alle entfernen", "Cerrar", "Borrar todo", "??", "????", "Fermer", "Tout effacer", "???????", "???????? ???", "?????", "??? ????", "Fechar", "Limpar tudo", "???", "??????", "??? ????", "??? ?????", "Zamknij", "Wyczy?? wszystko"}

on run
	try
		tell application "System Events"
			-- set _elements to UI elements of UI element 1 of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter" # just for info at the moment
			set _headings to UI elements of UI element 1 of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter" whose role is "AXHeading"
			set _headingscount to count of _headings
		end tell
		
		repeat _headingscount times
			tell application "System Events" to set _roles to role of UI elements of UI element 1 of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter"
			set _headingIndex to its getIndexOfItem:"AXHeading" inList:_roles
			set _closeButtonIndex to _headingIndex + 1
			tell application "System Events" to click item _closeButtonIndex of UI elements of UI element 1 of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter"
			delay 0.4
		end repeat
		
		tell application "System Events"
			set _buttons to buttons of UI element 1 of scroll area 1 of group 1 of group 1 of window "Notification Center" of application process "NotificationCenter"
			repeat with _button in _buttons
				set _actions to actions of _button
				repeat with _action in _actions
					if description of _action is in closeActionSet then
						perform _action
					end if
				end repeat
			end repeat
		end tell			
	on error e		
		display notification e with title "Error" sound name "Frog"
	end try
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