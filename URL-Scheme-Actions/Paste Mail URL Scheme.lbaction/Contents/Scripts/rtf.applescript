-- https://daringfireball.net/2007/12/message_urls_leopard_mail
-- https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/ManipulateListsofItems.html
-- https://stackoverflow.com/questions/21035368/applescript-less-than-number-or-greater-than-number 

-- Sources for new version using textutil:
-- https://www.alfredforum.com/topic/5653-creating-rich-text-links-in-mail-app/ 
-- https://ss64.com/osx/textutil.html 
-- https://discourse.devontechnologies.com/t/return-links-back-links/54390
-- Example: "<font size=\"5\" color=\"#8080BB\"><font face=\"Menlo\">'" & theList & "'</font></font>'"

on run
	tell application "Mail"
		set _sel to get selection
		set _results to {}
		repeat with _msg in _sel
			set _messageURL to "message://%3c" & _msg's message id & "%3e"
			set _sub to _msg's subject
			set _html to "<font size=\"4\"><font face=\"helvetica neue\"><a href=\"" & _messageURL & "\">" & _sub & "</a> </font></font>"
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
			set end of _results to "{date: \"" & _shortdate & "\", title: \"" & _sender & " am " & _date & "\", subtitle:\"" & _sub & "\", icon:\"threadTemplate.png\", badge: \"RTF\", actionArgument:\"" & _argument & "\", action:\"pasteRtf\"}"
		end repeat
		
		-- set _items to length of _results
		
		-- if _items is 1 then
		-- 	try				
		-- 		do shell script "echo " & quoted form of _html & "|textutil -inputencoding UTF-8 -format html  -convert rtf -stdin -stdout|LC_CTYPE=UTF-8 pbcopy"
		
		-- 		tell application "LaunchBar" to hide
		
		-- 		delay 0.1
		-- 		tell application "System Events"
		-- 			keystroke "v" using command down
		-- 		end tell
		
		-- 	on error e
		-- 		display dialog e
		-- 	end try
		
		-- else
		return _results
		-- end if
	end tell
end run
