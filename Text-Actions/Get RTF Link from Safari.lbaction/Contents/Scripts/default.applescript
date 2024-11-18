-- Sources 
-- https://macscripter.net/viewtopic.php?id=26498
-- https://stackoverflow.com/questions/23852182/i-need-to-url-encode-a-string-in-applescript
-- https://harvey.nu/applescript_url_encode_routine.html 
-- https://ascii.cl
-- https://stackoverflow.com/questions/32604557/creating-rtf-in-applescript-from-emails-how-to-deal-with-the-encoding-of-mails
-- http://www.biblioscape.com/rtf15_spec.htm
-- https://stackoverflow.com/questions/2850575/what-is-the-rtf-syntax-for-a-hyperlink
-- https://superuser.com/questions/28555/convert-file-type-to-utf-8-on-unix-iconv-is-failing
-- https://fmforums.com/topic/86952-bash-script-execution-with-filemaker/
-- https://www.eso.org/~ndelmott/ascii.html 
--
--
-- Sources for new version using textutil:
-- https://www.alfredforum.com/topic/5653-creating-rich-text-links-in-mail-app/ 
-- https://ss64.com/osx/textutil.html 
-- https://discourse.devontechnologies.com/t/return-links-back-links/54390
-- Example: "<font size=\"5\" color=\"#8080BB\"><font face=\"Menlo\">'" & theList & "'</font></font>'"

on handle_string(s)
	
	set _name to s
	
	try
		
		tell application "Safari"
			set _url to URL of front document
		end tell
		
		
		set _html to "<font size=\"4\"><font face=\"helvetica neue\"><a href=\"" & _url & "\">" & _name & "</a> </font></font>"
		
		do shell script "echo " & quoted form of _html & "|textutil -inputencoding UTF-8 -format html  -convert rtf -stdin -stdout|LC_CTYPE=UTF-8 pbcopy"
		
		
		tell application "LaunchBar" to hide
		
		delay 0.1
		tell application "System Events"
			keystroke "v" using command down
		end tell
		
	on error e
		display dialog e
	end try
	
end handle_string

on run
	try
		tell application "Safari"
			set _url to URL of front document
			set _name to name of front document
		end tell

		-- https://stackoverflow.com/questions/38041852/does-applescript-have-a-replace-function
		set _name to do shell script "sed 's|" & quoted form of "\\ -\\ YouTube" & "|" & quoted form of "" & "|g' <<< " & quoted form of _name

		-- You can tweak that to influence the font and font size. This example will result in Helvetica Neue 14pt. 
		-- The space between "</a>" and "</font>" is important. Otherwise you will get some Times 12pt in there.
		set _html to "<font size=\"4\"><font face=\"helvetica neue\"><a href=\"" & _url & "\">" & _name & "</a> </font></font>"
		
		do shell script "echo " & quoted form of _html & "|textutil -inputencoding UTF-8 -format html  -convert rtf -stdin -stdout|LC_CTYPE=UTF-8 pbcopy"
		
		
		tell application "LaunchBar" to hide
		
		delay 0.1
		tell application "System Events"
			keystroke "v" using command down
		end tell
		
	on error e
		display dialog e
	end try
end run