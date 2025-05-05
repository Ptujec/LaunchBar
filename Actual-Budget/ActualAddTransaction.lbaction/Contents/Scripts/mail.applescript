on run
	tell application "System Events"
		set processList to paragraphs of (do shell script "ps -c -U $USER -o command")
		
		if processList contains "Mail" then
			try
				tell application "Mail"
					set _sel to get selection
					set _links to {}
					repeat with _msg in _sel
						set _messageURL to "message://%3c" & _msg's message id & "%3e"
						set _subject to _msg's subject
						-- set _subject to do shell script "echo " & quoted form of _subject & "| sed 's/[\",]/\\\\&/g'" -- fix quotes to avoid trouble with JSON parsing
						set end of _links to _messageURL
					end repeat
					
					set _linkcount to length of _links
					
					if _linkcount is 1 then
						set _default to _links as Unicode text
					else
						set _default to item 1 of _links as Unicode text
					end if
				end tell
			on error
				set _default to ""
				set _subject to ""
			end try
		else
			set _default to ""
			set _subject to ""
		end if
	end tell
	set result to _default & "
" & _subject
end run