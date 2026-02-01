set _results to {}
try
	tell application id "com.apple.mail"
		set _sel to get selection
		
		repeat with _msg in _sel
			set _messageURL to "message://%3c" & _msg's message id & "%3e"
			set _subject to _msg's subject
			set _subject to do shell script "echo " & quoted form of _subject & "| sed 's/[\",]/\\\\&/g'" -- fix quotes to avoid trouble with JSON parsing
			
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
			
			set _title to "[" & _subject & "](" & _messageURL & ")"
			set _subtitle to _sender & " - " & _date
			set end of _results to "{date: \"" & _shortdate & "\",title:\"" & _title & "\", subtitle:\"" & _subtitle & "\", subject:\"" & _subject & "\", messageURL:\"" & _messageURL & "\", icon:\"com.apple.mail\", badge: \"Mail\", alwaysShowsSubtitle:true}"
		end repeat
	end tell
end try
return _results