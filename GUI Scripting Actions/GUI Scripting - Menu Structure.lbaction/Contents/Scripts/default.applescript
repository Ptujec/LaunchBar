-- http://hints.macworld.com/article.php?story=20111208191312748
-- http://macscripter.net/viewtopic.php?pid=146759

on run
	
	tell application "System Events"
		item 1 of (get name of processes whose frontmost is true)
		set appname to result
	end tell
	
	tell application appname
		activate
		delay 0.1
		#	display dialog "Welche App solls sein?" default answer appname buttons {"Abbrechen", "OK"} default button 2 with title "App?"
		# set userInput to the result
		# set appname to text returned of userInput		
	end tell
	
	--intelligent code, taken from Nigel Garvey
	tell application "System Events"
		tell application process appname
			set frontmost to true
			set {windowExists, menuExists} to {front window exists, menu bar 1 exists}
			set {winstuff, menustuff} to {missing value, missing value}
			if (windowExists) then set winstuff to my listToText(entire contents of front window)
			if (menuExists) then set menustuff to my listToText(entire contents of menu bar 1)
		end tell
	end tell
	
	-- the following block of simple-minded code is NOT by Nigel Garvey
	--tell application "TextEdit"
	--	activate
	--	make new document at the front
	--	set the text of the front document to winstuff & return & "-----" & return & menustuff
	--end tell
	
	--
	tell application "BBEdit"
		make new document with properties {name:appname & " - Menu Structure"}
		set the text of the front document to winstuff & return & "-----" & return & menustuff
		delay 0.1
		activate
	end tell
	--
	
	-- 	return {winstuff:winstuff, menustuff:menustuff}
end run

-- the heart of the script, the intelligent stuff, by Nigel Garvey
on listToText(entireContents) -- (Handler specialised for lists of System Events references.)
	try
		|| of entireContents -- Deliberate error.
	on error stuff -- Get the error message
	end try
	
	-- Parse the message.
	set astid to AppleScript's text item delimiters
	set AppleScript's text item delimiters to {"{", "}"} -- Snow Leopard or later.
	set stuff to text from text item 2 to text item -2 of stuff
	set AppleScript's text item delimiters to "\"System Events\", "
	set stuff to stuff's text items
	set AppleScript's text item delimiters to "\"System Events\"" & linefeed
	set stuff to stuff as text
	set AppleScript's text item delimiters to astid
	
	return stuff
end listToText