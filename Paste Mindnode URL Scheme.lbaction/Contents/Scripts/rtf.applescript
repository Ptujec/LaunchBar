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


-- get frontmost application

on run (_arguments)
	if (count of _arguments) is 2 then
		set theLink to item 1 of _arguments
		set linkText to item 2 of _arguments
		
	end if
	
	
	try
		
		-- replaces trouble maker character like e.g."|" which would cause the shell script not work  
		set linkText to urlencode(linkText)
		
		-- create the link on the clipboard
		set cmd to "\"{\\rtf1\\ansi\\ansicpg1252\\cocoartf949\\cocoasubrtf270{\\fonttbl\\f0\\fswiss\\fcharset0 Helvetica;}{\\colortbl;\\red255\\green255\\blue255;}\\margl1440\\margr1440\\vieww9000\\viewh8400\\viewkind0\\pard\\tx720\\tx1440\\tx2160\\tx2880\\tx3600\\tx4320\\tx5040\\tx5760\\tx6480\\tx7200\\tx7920\\tx8640\\ql\\qnatural\\pardirnatural{\\field{\\*\\fldinst{HYPERLINK \"" & theLink & "\"}}{\\fldrslt\\f0\\fs24 \\cf0 \"" & linkText & "\"}}}\""
		
		do shell script "/bin/bash -c 'echo " & cmd & " | iconv -f UTF-8 -t ASCII//TRANSLIT | pbcopy -Prefer rtf'"
		
	on error e
		
		display dialog "Some characters cause the rtf script to fail (e.g. brackets and stuff). It's a known issue. If you have fix please let me know." & "

" & e
		
	end try
	
	
	tell application "LaunchBar" to hide
	
	delay 0.1
	tell application "System Events"
		keystroke "v" using command down
	end tell
	
	
	
end run

-- 
on urlencode(linkText)
	set linkTextEnc to ""
	repeat with eachChar in characters of linkText
		set useChar to eachChar
		set eachCharNum to ASCII number of eachChar
		if eachCharNum = 124 then
			set useChar to "-"
		end if
		if eachCharNum = 40 then
			set useChar to "- "
		end if
		if eachCharNum = 41 then
			set useChar to ""
		end if
		if eachCharNum = 38 then
			set useChar to "-"
		end if
		
		set linkTextEnc to linkTextEnc & useChar as string
	end repeat
	return linkTextEnc
end urlencode