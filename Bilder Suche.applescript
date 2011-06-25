-- Source: http://forums.obdev.at/viewtopic.php?p=12250
-- additional coding by @ptujec and most of all :kelko:

on handle_string(thequery)
	try
		tell application "LaunchBar" to hide
		
		set nameQueryString to ""
		set commentQueryString to ""
		set keywordQueryString to ""
		set tagQueryString to ""
		
		set firstLoop to true
		repeat with aWord in every word in thequery
			
			if not firstLoop then
				set nameQueryString to nameQueryString & " && "
				set commentQueryString to commentQueryString & " && "
				set keywordQueryString to keywordQueryString & " && "
				set tagQueryString to tagQueryString & " && "
				
			else
				set firstLoop to false
			end if
			
			set nameQueryString to nameQueryString & " kMDItemDisplayName == " & quote & aWord & "*" & quote & "wc " & " && (kMDItemKind == \"*Bild*\" || kMDItemKind == \"*Graphic*\" || kMDItemKind == \"*Photoshop*\" || kMDItemKind == \"*Pixelmator*\")"
			
			set commentQueryString to commentQueryString & "kMDItemFinderComment == " & quote & aWord & "*" & quote & "wc " & " && (kMDItemKind == \"*Bild*\" || kMDItemKind == \"*Graphic*\" || kMDItemKind == \"*Photoshop*\" || kMDItemKind == \"*Pixelmator*\")"
			
			set tagQueryString to tagQueryString & "kMDItemOMUserTags  == " & quote & aWord & "*" & quote & "wc " & " && (kMDItemKind == \"*Bild*\" || kMDItemKind == \"*Graphic*\" || kMDItemKind == \"*Photoshop*\" || kMDItemKind == \"*Pixelmator*\")"
			
			set keywordQueryString to keywordQueryString & "kMDItemKeywords == " & quote & aWord & "*" & quote & "wc "
			
			
		end repeat
		
		set endQueryString to "'(" & tagQueryString & ") || (" & nameQueryString & ") || ( " & commentQueryString & " ) || ( " & keywordQueryString & " )'"
		set thecmd to "mdfind -onlyin ~  " & endQueryString
		
		-- set thecmd to "mdfind  -onlyin ~  'kMDItemDisplayName == " & quote & thequery & "*" & quote & "wc" & " && (kMDItemKind == \"Image\")" & " ||  kMDItemFinderComment == " & quote & thequery & "*" & quote & "wc" & " && (kMDItemKind == \"Image\")" & " || kMDItemKeywords == " & quote & thequery & "*" & quote & "wc'"
		
		set theresult to do shell script thecmd
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