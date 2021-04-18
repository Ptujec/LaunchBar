# https://developer.apple.com/library/archive/documentation/CoreServices/Reference/MetadataAttributesRef/Reference/CommonAttrs.html
# https://www.macobserver.com/tips/quick-tip/macos-grep-find-matching-lines/

on run (_arguments)
	set thequery to _arguments as string
	try
		set contentQueryString to "kMDItemTextContent  == " & quote & thequery & "*" & quote & "wc "
		set endQueryString to "'( " & contentQueryString & " )'"
		set thecmd to "mdfind -onlyin ~/Zotero/storage  " & endQueryString
		set theresult to do shell script thecmd & " grep"
		set thelist to {}
		set allparas to every paragraph in theresult
		set thelist to theresult
		if thelist is "" then
			tell application "LaunchBar"
				display in large type "Nothing found!" with sound "Submarine"
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
		tell application "BBEdit"
		make new document with properties {name:"Zotero Search Error", text:e}
		activate
		end tell
	end try
end run