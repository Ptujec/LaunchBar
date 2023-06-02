on run (_args)
  set _title to item 1 of _args
  set _url to item 2 of _args
  
	try  
    -- You can tweak that to influence the font and font size. This example will result in Helvetica Neue 14pt. 
		-- The space between "</a>" and "</font>" is important. Otherwise you will get some Times 12pt in there.
		set _html to "<font size=\"4\"><font face=\"helvetica neue\"><a href=\"" & _url & "\">" & _title & "</a> </font></font>"
		
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