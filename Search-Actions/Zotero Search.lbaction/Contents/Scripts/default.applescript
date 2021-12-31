# https://developer.apple.com/library/archive/documentation/CoreServices/Reference/MetadataAttributesRef/Reference/CommonAttrs.html
# https://www.macobserver.com/tips/quick-tip/macos-grep-find-matching-lines/

on run (_arguments)
	set thequery to _arguments as string
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
		set tagQueryString to tagQueryString & "kMDItemUserTags  == " & quote & aWord & "*" & quote & "wc "
	end repeat
	set endQueryString to "'(" & displayQueryString & ") || (" & commentQueryString & ") || ( " & tagQueryString & " )'"
	set thecmd to "mdfind -onlyin ~/Zotero/storage " & endQueryString
	set theresult to do shell script thecmd & " grep"
	return theresult
end run