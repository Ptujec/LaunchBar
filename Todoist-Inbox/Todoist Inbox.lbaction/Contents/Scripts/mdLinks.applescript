on handleYoutubeUrl(_URL, _time)
	set baseUrl to "https://www.youtube.com/watch?v="
	set ytId to ""
	
	if _URL contains "youtu.be" then
		set startPos to (offset of "youtu.be/" in _URL) + 9
		set ytId to text startPos thru end of _URL
		set qmarkPos to offset of "?" in ytId
		if qmarkPos > 0 then
			set ytId to text 1 thru (qmarkPos - 1) of ytId
		end if
	else
		if _URL contains "v=" then
			set startPos to (offset of "v=" in _URL) + 2
			set ytId to text startPos thru end of _URL
			set ampPos to offset of "&" in ytId
			if ampPos > 0 then
				set ytId to text 1 thru (ampPos - 1) of ytId
			end if
		end if
	end if
	
	if ytId is "" then
		return {_URL, ""}
	end if
	
	set newUrl to baseUrl & ytId
	if _time is not "" then
		try
			if (_time as number) > 10 then
				set newUrl to newUrl & "&t=" & _time & "s"
			end if
		end try
	end if
	
	return {newUrl, ytId}
end handleYoutubeUrl

on handleTwitchUrl(_URL, _time)
	set baseUrl to "https://www.twitch.tv/videos/"
	set videoId to ""
	
	if _URL contains "/videos/" then
		set startPos to (offset of "/videos/" in _URL) + 8
		set videoId to text startPos thru end of _URL
		set qmarkPos to offset of "?" in videoId
		if qmarkPos > 0 then
			set videoId to text 1 thru (qmarkPos - 1) of videoId
		end if
	end if
	
	if videoId is "" then
		return {_URL, ""}
	end if
	
	set newUrl to baseUrl & videoId
	if _time is not "" then
		try
			if (_time as number) > 10 then
				set newUrl to newUrl & "?t=" & _time & "s"
			end if
		end try
	end if
	
	return {newUrl, videoId}
end handleTwitchUrl

on run
	set _processes to paragraphs of (do shell script "ps -c -U $USER -o command")
	set _processes to paragraphs of (do shell script "ps -c -U $USER -o command")
	
	set _results to {}
	
	if "Mail" is in _processes then
		
		tell application "Mail"
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
				set end of _results to "{date: \"" & _shortdate & "\",title:\"" & _title & "\", subtitle:\"" & _subtitle & "\", icon:\"com.apple.mail\", badge: \"Mail\", alwaysShowsSubtitle:true}"
			end repeat
		end tell
	end if
	
	if "Safari" is in _processes then
		try
			tell application "Safari"
				set _URL to URL of front document
				set _time to ""
				if (_URL contains "youtube.com") or (_URL contains "youtu.be") or (_URL contains "twitch.tv") then
					try
						set _time to (do JavaScript "String(Math.round(document.querySelector('video').currentTime))" in front document) as string
					on error e
						-- do nothing
					end try
				end if
				
				set _title to name of front document
				set _title to do shell script "echo " & quoted form of _title & "| sed 's/[\",]/\\\\&/g'" -- fix quotes to avoid trouble with JSON parsing
				
				if _URL contains "youtube.com" or _URL contains "youtu.be" then
					set urlResult to my handleYoutubeUrl(_URL, _time)
					set _URL to item 1 of urlResult
				else if _URL contains "twitch.tv" then
					set urlResult to my handleTwitchUrl(_URL, _time)
					set _URL to item 1 of urlResult
				end if
			end tell
			set _title to "[" & _title & "]" & "(" & _URL & ")" as text
			
			set end of _results to "{date: \"\",title:\"" & _title & "\", icon:\"com.apple.safari\", badge: \"Safari\"}"
		end try
	end if
	return _results
	
end run