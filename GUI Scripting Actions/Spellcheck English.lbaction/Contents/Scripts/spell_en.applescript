(*
Toggle Spell Checking Language for Mac OS X 10.5 Leopard
v0.1.2 - 2009-05-06

based on: http://forums.macosxhints.com/showthread.php?t=26835
see also: http://www.cocoacrumbs.com/blog/?p=96

---
adapted for use with LaunchBar (nonactivating mode) to a specific language
(if you just use two languages anyway stick to the original)
by @ptujec

*)

property new_lang : "U.S. English" --change to option given in menu

set app_name to my get_front_app()

-- adjustment for usage with LaunchBar (nonactivating mode)
-- tell me to activate

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

tell application app_name
	activate
end tell
tell application "System Events"
	tell process app_name
		if not (exists (window name_of_spelling_window)) then
			keystroke ":" using {command down, shift down}
			delay 0.2 --need to adjust for your machine
		end if
		if exists (window name_of_spelling_window) then
			tell window name_of_spelling_window
				tell pop up button 1
					set current_lang to value as string
					click
					keystroke new_lang
					-- tell menu 1
					--	click menu item new_lang
					-- end tell
					keystroke return
				end tell
				click (the first button whose subrole is "AXCloseButton")
			end tell
		else
			tell application app_name
				activate
				display dialog error_message buttons {"OK"} default button 1 with icon stop
			end tell
		end if
	end tell
end tell

on get_front_app()
	tell application "System Events"
		delay 0.1
		set appname to name of (first process whose frontmost is true) as string
		-- only for Fluidapps ... and maybe not helpful if you use a lot ;(
		-- if appname is "FluidInstance" then
		--	set appname to "Facebook"
		-- end if
	end tell
	return appname
end get_front_app