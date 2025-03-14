(* 
Get App ID Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-22

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Sources: 
- http://macscripter.net/viewtopic.php?id=24569
*)

on open (_file)
	try
		set appID to bundle identifier of (info for (_file))
		set the clipboard to appID
		-- tell application "LaunchBar" to set selection to appID as string
		return {title:appID, subtitle:"⏎ = Paste", actionArgument:appID, action:"paste", icon:appID}
	on error e
		tell me to activate
		display dialog e
	end try
end open

on paste(appID)
	tell application "LaunchBar" to perform action "Copy and Paste" with string appID
end paste