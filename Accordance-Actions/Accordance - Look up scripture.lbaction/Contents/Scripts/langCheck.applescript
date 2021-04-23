# Ptujec 2021-04-23
# detect app language setting 

on run ()
	try
		tell current application to set s to do shell script "/usr/libexec/PlistBuddy -c 'Print :AppleLanguages:0: ' ~/Library/Preferences/com.OakTree.Accordance.plist"
	on error
		tell current application to set s to do shell script "/usr/libexec/PlistBuddy -c 'Print :AppleLanguages:0: ' /Library/Preferences/.GlobalPreferences.plist"
	end try
	
	return s
end run