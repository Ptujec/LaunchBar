-- https://github.com/aristidesfl/launchbar-scripts
--
-- modified by Ptujec 2011-01-30
-- 	added:
-- 		- Growl priority
--		- Growl Notification for "on error"
--		- delay for hiding LaunchBar (only relevant if you use animations)
-- 	changed
-- 		- Cloudapp support (ShortURL)
-- 		- Notification instead of selecting ShortURL

--USAGES:
--1. To share a file/folder, select it and send it to this action
--2. To share a screenshot select this action and press return
--3. To share a screenshot with a name, selecte this action, press space, enter a name and press return

-- 2012-11-09 
-- Changes:
-- got rid of short url
-- added support for notification center (requires Launchbar)


--============== MODIFY HERE ===================--

property dropboxID : 123456 --> Replace this number with your dropbox ID

--============== MODIFY HERE ===================--

on run
	try
		
		if application "Dropbox" is not running then launch application "Dropbox"
		set ifolder to {path to home folder as string, "Dropbox:Public:"} as string
		tell application "LaunchBar" to hide
		
		set {year:y, month:m, day:d, hours:h, minutes:m, seconds:s} to (current date)
		set theDate to (h & "h" & m & "m" & s & "s")
		
		set theformat to "png"
		set thename to "screenshot" & theDate & "." & theformat
		set the_file to ""
		set thecmd to my dupcheck(thename, ifolder, theformat, dropboxID, the_file)
		
		
	on error e
		tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
	end try
end run

on open (the_file)
	try
		
		if application "Dropbox" is not running then launch application "Dropbox"
		set ifolder to {path to home folder as string, "Dropbox:Public:"} as string
		
		tell application "LaunchBar" to hide
		try
			set text item delimiters to ":"
			set thename to last text item of (the_file as text)
			set theformat to "file"
			
			if thename = "" then
				set thename to text item ((count of text items of (the_file as text)) - 1) of (the_file as text)
				set theformat to "folder"
				
			end if
			set suggest to "&suggest=" & thename
			set text item delimiters to ""
		on error
			set text item delimiters to ""
		end try
		
		
		set thecmd to my dupcheck(thename, ifolder, theformat, dropboxID, the_file)
		
		
	on error e
		tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
	end try
	
	
end open

on handle_string(thetext)
	try
		
		
		if application "Dropbox" is not running then launch application "Dropbox"
		set ifolder to {path to home folder as string, "Dropbox:Public:"} as string
		
		tell application "LaunchBar" to hide
		delay 0.4
		
		set AppleScript's text item delimiters to ","
		set thename to first text item of thetext
		set theformat to false
		try
			set theformat to text 2 thru -1 of second text item of thetext
		end try
		if theformat is false then set theformat to "png"
		set AppleScript's text item delimiters to ""
		set thename to thename & "." & theformat as text
		set suggest to "&suggest=" & thename
		set the_file to ""
		set thecmd to my dupcheck(thename, ifolder, theformat, dropboxID, the_file)
		
	on error e
		tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
	end try
end handle_string


-------------------------------------------------------------------
--Handlers
-------------------------------------------------------------------


on dupcheck(thename, ifolder, theformat, dropboxID, the_file)
	set thedupcheck to ifolder & thename
	if theformat = "folder" then
		set thedupcheck to thedupcheck & ".zip"
	end if
	tell me to activate
	
	tell application "Finder" to if not (exists (POSIX path of thedupcheck) as POSIX file) then
		--Changed Lines******************************************************	
		set thedecision to my processitem(thename, ifolder, theformat, dropboxID, the_file)
	else
		tell me to activate
		set thedisplay to display dialog "An item with the name \"" & thename & "\" already exists in the destination" buttons {"Cancel ", "Rename", "Replace"} default button "Replace"
		
		if button returned of thedisplay is "Replace" then
			my processreplace(thename, ifolder, theformat, dropboxID, the_file)
		else if button returned of thedisplay is "Rename" then
			my processrename(thename, ifolder, theformat, dropboxID, the_file)
		else
			return "Canceled"
			
		end if
	end if
end dupcheck

on processitem(thename, ifolder, theformat, dropboxID, the_file)
	if theformat = "file" then
		tell application "Finder" to copy file the_file to folder ifolder
		tell application "LaunchBar" to display in notification center with title "Uploading file" subtitle thename
		
	else if theformat = "folder" then
		do shell script "zip -r " & (POSIX path of ifolder) & thename & " " & (POSIX path of the_file) & ""
		set thename to thename & ".zip"
		tell application "LaunchBar" to display in notification center with title "Uploading file" subtitle thename
		
	else if theformat = "filerename" then
		set thecmd to "cp " & (POSIX path of the_file) & " " & (POSIX path of ifolder) & thename
		do shell script thecmd
		tell application "LaunchBar" to display in notification center with title "Uploading file" subtitle thename
		
	else
		set ifile to ifolder & thename
		set qifile to quoted form of (POSIX path of ifile)
		set thecmd to "screencapture -i -t " & theformat & " " & qifile
		do shell script thecmd
		tell application "LaunchBar" to display in notification center with title "Uploading Screenshot" subtitle thename
		
	end if
	my processurl(thename, dropboxID)
	
	
end processitem

on processreplace(thename, ifolder, theformat, dropboxID, the_file)
	
	set ifile to ifolder & thename
	if theformat = "folder" then
		set ifile to ifile & ".zip"
	end if
	set qifile to quoted form of (POSIX path of ifile)
	do shell script "rm -r " & qifile
	set qifolder to quoted form of (POSIX path of ifolder)
	my processitem(thename, ifolder, theformat, dropboxID, the_file)
end processreplace

on processrename(thename, ifolder, theformat, dropboxID, the_file)
	repeat
		set AppleScript's text item delimiters to "."
		set theonlyname to text items 1 thru -2 of thename
		set thenameextension to last text item of thename
		set AppleScript's text item delimiters to ""
		tell me to activate
		set thename to text returned of (display dialog "Enter the new name: (This dialog box will reappear if an item with the new name you specified also exists in the destination folder)" default answer theonlyname)
		if theformat is not equal to "folder" then
			set thename to thename & "." & thenameextension
		end if
		set thenewcheck to ifolder & thename
		
		if theformat = "file" then set theformat to "filerename"
		
		tell application "Finder" to if not (exists (POSIX path of thenewcheck) as POSIX file) then
			my processitem(thename, ifolder, theformat, dropboxID, the_file)
			exit repeat
		end if
	end repeat
end processrename

on processurl(thename, dropboxID)
	try
		set AppleScript's text item delimiters to " "
		set thename to text items of thename
		set AppleScript's text item delimiters to ""
		set suggest to "&suggest=" & thename as string
		set wordcount to do shell script "echo " & quoted form of suggest & " | wc -c"
		set wordcount to do shell script "echo " & quoted form of wordcount & " | sed 's/^[    ]*//'"
		if wordcount > 25 then
			set suggest to ""
		end if
		set AppleScript's text item delimiters to "%20"
		set thename to thename as string
		set AppleScript's text item delimiters to ""
	end try
	set theurl to "http://dl.getdropbox.com/u/" & dropboxID & "/" & thename
	-- set shortURL to shortenURL(theurl)
	
	set the clipboard to theurl -- shortURL
	tell application "LaunchBar" to display in notification center with title "URL copied to clipboard" subtitle theurl
	
	
	
end processurl