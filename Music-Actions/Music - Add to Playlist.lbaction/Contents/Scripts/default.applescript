on run
	tell application "Music" to set _playlists to every user playlist whose smart is false
	
	set output to {}
	repeat with p in _playlists
		set _name to name of p
		set end of output to {title:_name, icon:"plTemplate", action:"addToPlaylist", actionArgument:_name, actionRunsInBackground:true}
	end repeat
	return output
end run

on addToPlaylist(_name)
	tell application "LaunchBar" to hide
	tell application "System Events"
		
		# Localizations
		set edit_lang to name of menu bar item 4 of menu bar 1 of application process "Music"
		if edit_lang is "Edit" then -- en
			set _window to "Window"
			set _switch_to_miniplayer to "Switch to MiniPlayer"
			set _add_to_playlist to "Add to Playlist"
			set _song to "Song"
		else if edit_lang is "Bearbeiten" then -- de
			set _window to "Fenster"
			set _switch_to_miniplayer to "Zum MiniPlayer wechseln"
			set _add_to_playlist to "Zur Playlist hinzufügen"
			set _song to "Titel"
		end if

		# Main action
		try
			click menu item _switch_to_miniplayer of menu _window of menu bar item _window of menu bar 1 of application process "Music" -- We need to change the view to be able to use the following menu items … otherwise they are greyed out 
		end try
		
		delay 0.2
		
		click menu item _name of menu _add_to_playlist of menu item _add_to_playlist of menu _song of menu bar item _song of menu bar 1 of application process "Music"
		
		delay 0.2
		
		
		click menu item "MiniPlayer" of menu _window of menu bar item _window of menu bar 1 of application process "Music" -- Change view back to original
		
		delay 0.2
		
		try
			tell application "Music" to set view of front browser window to user playlist _name
		end try
		set visible of application process "Music" to false
	end tell
end addToPlaylist