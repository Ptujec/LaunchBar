
(*
Toggle Spell Checking Language for Mac OS X 10.10 Yosemite
v0.2.0 - 2014-10-18

based on: http://forums.macosxhints.com/showthread.php?t=26835
see also: http://www.cocoacrumbs.com/blog/?p=96
http://hints.macworld.com/article.php?story=20090512175846504

---
adapted for use with LaunchBar (nonactivating mode) to a specific language
(if you just use two languages anyway stick to the original)
by @ptujec

If it is not working … picking some other language … go to settings uncheck Slovene close … then set the checkbox again

*)

property new_lang : "Slovenščina (Library)" --change to option given in menu

set app_name to my get_front_app()

tell application "System Events"
	tell process app_name
		set langdetect to name of menu bar item 4 of menu bar 1
	end tell
end tell

if langdetect is "Edit" then -- en
	set name_of_spelling_window to "Spelling and Grammar"
	set error_message to "Spell options not available for this application!"
end if
if langdetect is "Bearbeiten" then -- de
	set name_of_spelling_window to "Rechtschreibung und Grammatik"
	set error_message to "Rechtschreibung und Grammatik nicht verfügbar!"
end if

tell application app_name to activate

tell application "System Events"
	tell process app_name
		if not (exists (window name_of_spelling_window)) then
			keystroke ":" using {command down, shift down}
			delay 0.1 --need to adjust for your machine
		end if
		if exists (window name_of_spelling_window) then
			tell window name_of_spelling_window
				tell pop up button 1
					click
					-- delay 0.1
					keystroke "Deutsch" -- dirty hack because Slovenščina is not recognized 
					key code 125
					keystroke return
				end tell
				click (the first button whose subrole is "AXCloseButton")
			end tell
		else
			tell application app_name
				display dialog error_message buttons {"OK"} default button 1 with icon stop
			end tell
		end if
	end tell
	delay 0.1
	key code 125 using command down
end tell

on get_front_app()
	tell application "System Events"
		delay 0.1
		set appname to name of (first process whose frontmost is true) as string
	end tell
	return appname
end get_front_app