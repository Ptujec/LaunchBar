(* 
Close notifications Applescript Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-12

requires macOS 15.2

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Helpful:
- https://applehelpwriter.com/2016/08/09/applescript-get-item-number-of-list-item/
- https://www.macscripter.net/t/coerce-gui-scripting-information-into-string/62842/3
- https://forum.keyboardmaestro.com/t/understanding-applescript-ui-scripting-to-click-menus/29039/23?page=2
*)

property alertAndBannerSet : {"AXNotificationCenterAlert", "AXNotificationCenterBanner"}
property closeActionSet : {"Close", "Clear All", "Schließen", "Alle entfernen", "Cerrar", "Borrar todo", "关闭", "清除全部", "Fermer", "Tout effacer", "Закрыть", "Очистить все", "إغلاق", "مسح الكل", "Fechar", "Limpar tudo", "閉じる", "すべてクリア", "बंद करें", "सभी हटाएं", "Zamknij", "Wyczyść wszystko"}

on run
	tell application "System Events"
		
		try
			set _main_group to group 1 of scroll area 1 of group 1 of group 1 of window 1 of application process "NotificationCenter"
		on error eStr number eNum
			display notification eStr with title "Error " & eNum sound name "Frog"
			return
		end try
		
		try
			set _groups to groups of _main_group
			if _groups is {} then
				if subrole of _main_group is in alertAndBannerSet then
					set _actions to actions of _main_group
					repeat with _action in _actions
						if description of _action is in closeActionSet then
							perform _action
						end if
					end repeat
				end if
				return
			end if
			
			repeat with _group in _groups
				set _actions to actions of first item of _groups # always picking the first to avoid index error
				repeat with _action in _actions
					if description of _action is in closeActionSet then
						perform _action
					end if
				end repeat
			end repeat
		on error
			if subrole of _main_group is in alertAndBannerSet then
				set _actions to actions of _main_group
				repeat with _action in _actions
					if description of _action is in closeActionSet then
						perform _action
					end if
				end repeat
			end if
		end try
	end tell
end run




