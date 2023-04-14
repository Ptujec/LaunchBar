(* 
Add to Playlist Action Script for LaunchBar
by Christian Bender (@ptujec)
2023-04-14

Important: Requires the following shortcut: https://www.icloud.com/shortcuts/67c0315a9886405c9f7b830a18df7b6f

Read/write plist: https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/WorkwithPropertyListFiles.html

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run
	# Get last used playlist from Preferences.plist
	tell application "System Events"
		try
			set thePropertyListFilePath to "~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.MusicAddToPlaylist/Preferences.plist"
			
			tell property list file thePropertyListFilePath
				set _recent_name to value of property list item "recent_playlist"
				set _badge to value of property list item "badge"
			end tell
		on error
			set _recent_name to ""
			set _badge to ""
		end try
	end tell
	
	set output to {}
	
	# Get playlists from Music 
	tell application "Music" to set _playlists to every user playlist whose smart is false
	
	repeat with p in _playlists
		set _name to name of p
		if _name is not _recent_name then
			set end of output to {title:_name, icon:"plTemplate", action:"addToPlaylist", actionArgument:_name, actionRunsInBackground:true}
		end if
	end repeat
	
	if _recent_name is not "" then
		set beginning of output to {title:_recent_name, icon:"plTemplate", badge:_badge, action:"addToPlaylist", actionArgument:_recent_name, actionRunsInBackground:true}
	end if
	
	return output
end run

on addToPlaylist(_name)
	tell application "LaunchBar" to hide
	tell application "Shortcuts Events" to run shortcut "Add to Playlist" with input _name -- requires the following shortcut: https://www.icloud.com/shortcuts/67c0315a9886405c9f7b830a18df7b6f
	
	tell application "System Events"
		-- 	set _frontmost to item 1 of (get name of processes whose frontmost is true)
		
		# Localizations
		set edit_lang to name of menu bar item 4 of menu bar 1 of application process "Music"
		if edit_lang is "Edit" then -- en
			-- set _window to "Window"
			-- set _switch_to_miniplayer to "Switch to MiniPlayer"
			-- set _add_to_playlist to "Add to Playlist"
			-- set _song to "Song"
			set badge_name to "last used"
		else if edit_lang is "Bearbeiten" then -- de
			-- set _window to "Fenster"
			-- set _switch_to_miniplayer to "Zum MiniPlayer wechseln"
			-- set _add_to_playlist to "Zur Playlist hinzufügen"
			-- set _song to "Titel"
			set badge_name to "zuletzt benutzt"
		end if
		
		-- 	# Main action
		-- 	try
		-- 		click menu item _switch_to_miniplayer of menu _window of menu bar item _window of menu bar 1 of application process "Music" -- We need to change the view to be able to use the following menu items … otherwise they are greyed out 
		-- 	end try
		
		-- 	delay 0.2
		
		-- 	click menu item _name of menu _add_to_playlist of menu item _add_to_playlist of menu _song of menu bar item _song of menu bar 1 of application process "Music"
		
		-- 	delay 0.2
		
		-- 	click menu item "MiniPlayer" of menu _window of menu bar item _window of menu bar 1 of application process "Music" -- Change view back to original
		
		-- 	delay 0.2
		
		-- 	-- try
		-- 	-- 	tell application "Music" to set view of front browser window to user playlist _name
		-- 	-- end try
		
		-- 	if _frontmost is not "Music" then
		-- 		set visible of application process "Music" to false
		-- 	end if
		
		# Write last used playlist to Preferences.plist
		set theParentDictionary to make new property list item with properties {kind:record}
		set thePropertyListFilePath to "~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.MusicAddToPlaylist/Preferences.plist"
		set thePropertyListFile to make new property list file with properties {contents:theParentDictionary, name:thePropertyListFilePath}
		
		tell property list items of thePropertyListFile
			make new property list item at end with properties {kind:record, name:"recent_playlist", value:_name}
			make new property list item at end with properties {kind:record, name:"badge", value:badge_name}
		end tell
	end tell
end addToPlaylist