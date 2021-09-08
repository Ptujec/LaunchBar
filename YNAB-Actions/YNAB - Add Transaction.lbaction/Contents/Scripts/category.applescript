# https://stackoverflow.com/questions/44486999/turn-list-into-applescript-array
# https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/ManipulateListsofItems.html

on run (input)
	set input to input as string
	set input to paragraphs of input
	
	tell application "System Events"
		activate
		-- default raus wenn teilen
		set result to choose from list input with title "Category" with prompt "Choose category" default items "Supermarkt (Lebensmittel)"
	end tell
	
end run