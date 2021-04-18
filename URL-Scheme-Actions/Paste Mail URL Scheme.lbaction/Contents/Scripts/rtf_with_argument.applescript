-- https://daringfireball.net/2007/12/message_urls_leopard_mail
-- https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/ManipulateListsofItems.html
-- https://stackoverflow.com/questions/21035368/applescript-less-than-number-or-greater-than-number


-- Sources for new version using textutil:
-- https://www.alfredforum.com/topic/5653-creating-rich-text-links-in-mail-app/ 
-- https://ss64.com/osx/textutil.html 
-- https://discourse.devontechnologies.com/t/return-links-back-links/54390
-- Example: "<font size=\"5\" color=\"#8080BB\"><font face=\"Menlo\">'" & theList & "'</font></font>'" 

on run (s)
	tell application "Mail"
		set _sel to get selection
		set _links to {}
		repeat with _msg in _sel
			set _messageURL to "message://%3c" & _msg's message id & "%3e"
			set end of _links to _messageURL
		end repeat
		
		set _items to length of _links
		
		if _items is 1 then
			
			try
				
				-- You can tweak that to influence the font and font size. This example will result in Helvetica Neue 14pt. 
				-- The space between "</a>" and "</font>" is important. Otherwise you will get some Times 12pt in there.
				set _html to "<font size=\"4\"><font face=\"helvetica neue\"><a href=\"" & _links & "\">" & s & "</a> </font></font>"
				
				do shell script "echo " & quoted form of _html & "|textutil -inputencoding UTF-8 -format html  -convert rtf -stdin -stdout|LC_CTYPE=UTF-8 pbcopy"
				
				
				tell application "LaunchBar" to hide
				
				delay 0.1
				tell application "System Events"
					keystroke "v" using command down
				end tell
				
			on error e
				display dialog e
			end try
			
		else
			tell application "LaunchBar" to set selection to _links
		end if
	end tell
end run
