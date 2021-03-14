
tell application "System Events"
	item 1 of (get name of processes whose frontmost is true)
	set appname to result
	
	
	try
		
		click menu item "Während der Texteingabe prüfen" of menu "Rechtschreibung und Grammatik" of menu item "Rechtschreibung und Grammatik" of menu "Bearbeiten" of menu bar item "Bearbeiten" of menu bar 1 of application process appname
	on error
		
		try
			
			click menu item "Rechtschreibung bei Eingabe prüfen" of menu "Rechtschreibung" of menu item "Rechtschreibung" of menu "Text" of menu bar item "Text" of menu bar 1 of application process appname
			
		on error
			
			click menu item "Check Spelling as You Type" of menu "Spelling" of menu item "Spelling" of menu "Edit" of menu bar item "Edit" of menu bar 1 of application process appname
		end try
		
		
	end try
	
	
end tell
