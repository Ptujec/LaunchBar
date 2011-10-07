-- »Get Markdown Link«
-- 2011-10-07
-- Ptujec
-- 
-- truncateString() function by @cometbus 

on run
	
	tell application "Safari"
		set longURL to URL of front document
		set title to name of front document
	end tell
	
	set title_display to truncateString(title, 100)
	-- set the clipboard to title_display & " " & "-" & " " & shortURL as text
	
	set _result to "[" & title_display & "]" & "(" & longURL & ")" as text
	
	-- tell application "LaunchBar" to set selection as text to _result
	-- set the clipboard to _result
	tell application "LaunchBar" to perform action "Copy and Paste" with string _result
	
	--tell application "LaunchBar"
	--	display in large type title_display & " " & "-" & " " & shortURL as text with sound "Pop"
	--	delay 1.5
	--	hide
	--end tell
	
end run

-------------------------------------------

on truncateString(inString, len)
	if length of inString < len then
		return inString
	else
		return text 1 thru len of inString & "..."
	end if
end truncateString