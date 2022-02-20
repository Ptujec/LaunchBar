-- https://daringfireball.net/2007/12/message_urls_leopard_mail
-- https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/ManipulateListsofItems.html
-- https://stackoverflow.com/questions/21035368/applescript-less-than-number-or-greater-than-number 

on run
	tell application "Mail"
		set _sel to get selection
		set _results to {}
		repeat with _msg in _sel
			set _messageURL to "message://%3c" & _msg's message id & "%3e"
			set _sub to _msg's subject
			set _sender to _msg's sender
			try
				set _sender to extract name from _sender
				if "," is in _sender then
					set _sender to last word of _sender
				else
					set _sender to first word of _sender
				end if
			end try
			set _date to _msg's date received
			set _year to year of _date
			set _month to month of _date as number
			if _month < 10 then
				set _month to 0 & _month
			end if
			set _day to day of _date
			if _day < 10 then
				set _day to 0 & _day
			end if
			set _shortdate to _year & "-" & _month & "-" & _day & " " & time string of _date as string
			set _argument to _messageURL & "\\n" & _sub
			set end of _results to "{date: \"" & _shortdate & "\", title: \"" & _sender & " am " & _date & "\", subtitle:\"" & _sub & "\", icon:\"threadTemplate.png\", badge: \"MD\", actionArgument:\"" & _argument & "\", action:\"paste\"}"
		end repeat
		
		return _results
	end tell
end run