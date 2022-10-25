(*
Toggle Spell Checking Language

based on: http://forums.macosxhints.com/showthread.php?t=26835
see also: http://www.cocoacrumbs.com/blog/?p=96

Updated for Monterey 2021-11-03
@Ptujec
*)

property new_lang : "Deutsch" --change to option given in menu

set app_name to my get_front_app()

tell application "System Events"
	
	tell process app_name
		
		set edit_lang to name of menu bar item 4 of menu bar 1
	end tell
	
	if edit_lang is "Edit" then -- en
		set name_of_spelling_window to "Spelling and Grammar"
		set name_of_spelling_item to "Show Spelling and Grammar"
	end if
	if edit_lang is "Bearbeiten" then -- de
		set name_of_spelling_window to "Rechtschreibung und Grammatik"
		set name_of_spelling_item to "Rechtschreibung und Grammatik einblenden"
	end if
	
	click menu item name_of_spelling_item of menu name_of_spelling_window of menu item name_of_spelling_window of menu edit_lang of menu bar item edit_lang of menu bar 1 of application process app_name

	delay 0.2
	
	click pop up button 1 of window name_of_spelling_window of application process app_name


	keystroke new_lang
	keystroke return
	
	click (the first button of window name_of_spelling_window of application process app_name whose subrole is "AXCloseButton")
	
	delay 0.1
	key code 124 using command down
	-- key code 49
	-- key code 51
	
end tell


on get_front_app()
	tell application "System Events"
		set appname to name of (first process whose frontmost is true) as string
	end tell
	return appname
end get_front_app