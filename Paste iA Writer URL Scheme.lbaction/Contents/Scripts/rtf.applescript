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

on run (_arguments)
	if (count of _arguments) is 2 then
		set _url to item 1 of _arguments
		set _name to item 2 of _arguments
		
	end if
	
	try
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