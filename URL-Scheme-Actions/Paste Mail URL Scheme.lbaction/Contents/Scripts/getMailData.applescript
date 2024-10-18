(* 
Get Mail Data Applescript for LaunchBar Action: Paste Mail URL Scheme
by Christian Bender (@ptujec)
2024-10-18

See default.js for sources

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run
	
	set _processes to paragraphs of (do shell script "ps -c -U $USER -o command")
	
	set _results to {}
	if "Mail" is in _processes then
		tell application "Mail"
			set _sel to get selection
			set _results to {}
			repeat with _msg in _sel
				# Message URL (ID)
				set _url to "message://%3c" & _msg's message id & "%3e"
				
				# Subject
				set _subject to _msg's subject
				set _subject to do shell script "echo " & quoted form of _subject & "| sed 's/\"/\\\\\"/g'" -- fix quotes to avoid trouble with JSON parsing
				
				# Sender
				set _sender to _msg's sender
				try
					set _sender to extract name from _sender
					if "," is in _sender then
						set _sender to last word of _sender
					else
						set _sender to first word of _sender
					end if
				end try
				
				# Date
				set _date to _msg's date received
				
				# Format short date
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
				
				set end of _results to "{shortdate: \"" & _shortdate & "\", date: \"" & _date & "\", sender: \"" & _sender & "\", subject:\"" & _subject & "\", url:\"" & _url & "\"}"
			end repeat
			
		end tell
	else
		set _results to false
	end if
	
	return _results
end run
