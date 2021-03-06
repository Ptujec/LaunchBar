-- https://daringfireball.net/2007/12/message_urls_leopard_mail
-- https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/ManipulateListsofItems.html
-- https://stackoverflow.com/questions/21035368/applescript-less-than-number-or-greater-than-number 

on run
	tell application "Mail"
		set _sel to get selection
		set _links to {}
		repeat with _msg in _sel
			set _messageURL to "message://%3c" & _msg's message id & "%3e"
			set end of _links to _messageURL
		end repeat
		
		set _items to length of _links
		
		if _items is 1 then
			tell application "LaunchBar" to perform action "Copy and Paste" with string _links as text
		else
			tell application "LaunchBar" to set selection to _links
		end if
	end tell
end run
