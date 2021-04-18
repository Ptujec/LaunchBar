-- http://forums.obdev.at/viewtopic.php?p=12250#p12250
-- additional coding by @ptujec and most of all :kelko:

on handle_string(thequery)
	try
		tell application "LaunchBar" to hide
		
		set displayQueryString to ""
		set commentQueryString to ""
		set tagQueryString to ""
		set firstLoop to true
		repeat with aWord in every word in thequery
			
			if not firstLoop then
				set displayQueryString to displayQueryString & " && "
				set commentQueryString to commentQueryString & " && "
				set tagQueryString to tagQueryString & " && "
				
			else
				set firstLoop to false
			end if
			
			set displayQueryString to displayQueryString & " kMDItemDisplayName == " & quote & aWord & "*" & quote & "wc "
			
			set commentQueryString to commentQueryString & "kMDItemFinderComment == " & quote & aWord & "*" & quote & "wc "
			
			set tagQueryString to tagQueryString & "kMDItemOMUserTags  == " & quote & aWord & "*" & quote & "wc "
			
			
		end repeat
		
		set endQueryString to "'(" & displayQueryString & ") || (" & commentQueryString & ") || ( " & tagQueryString & " )'"
		set thecmd to "mdfind -onlyin ~  " & endQueryString
		
		set theresult to do shell script thecmd & " | grep -v ~/Backups/Mail" & " | grep -v ~/Library/Caches/Metadata/Safari/History"
		set thelist to {}
		set allparas to every paragraph in theresult
		repeat with apara in allparas
			set end of thelist to (POSIX file apara) as alias
		end repeat
		if thelist is {} then
			tell application "LaunchBar"
				display in large type "Nix gefunden!" with sound "Submarine"
				delay 0.7
				hide
			end tell
		else
			tell application "LaunchBar"
				set selection to thelist
				activate
			end tell
		end if
		
	on error e
		tell application "LaunchBar"
			display in large type e with sound "Submarine"
			delay 1.5
			hide
		end tell
	end try
end handle_string