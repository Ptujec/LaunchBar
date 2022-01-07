on run
	tell application "System Events"
		set allApps to displayed name of (every process whose background only is false) as list
	end tell
	
	if "Mail" is in allApps then
		tell application "Mail"
			set _sel to get selection
			set _mailMD to {}
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
				
				set _md_link to "[" & _sub & "](" & _messageURL & ")"
				set end of _mailMD to _md_link & "--" & _sender & " am " & _date & "
"
			end repeat
		end tell
	else
		set _mailMD to ""
	end if
	
	if "Safari" is in allApps then
		try
			tell application "Safari"
				set _URL to URL of front document
				set _title to name of front document
			end tell
			set _safariMD to "[" & _title & "]" & "(" & _URL & ")" as text
		on error
			set _safariMD to ""
		end try
	else
		set _safariMD to ""
	end if
	
	return _mailMD & "_" & _safariMD as string
end run