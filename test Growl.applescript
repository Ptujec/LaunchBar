-- by Ptujec 2011-06-22

on run
	my growlRegister()
	growlNotify("Low", "A low priority notification", -2)
	delay 0.2
	my growlRegister()
	growlNotify("Moderat", "A moderat priority notification", -1)
	delay 0.2
	my growlRegister()
	growlNotify("Normal", "A normal priority notification", 0)
	delay 0.2
	my growlRegister()
	growlNotify("Important", "A high priority notification", 1)
	delay 0.2
	my growlRegister()
	growlNotify("Very Important", "A emergancy priority notification", 2)
	
end run

on growlRegister()
	tell application "GrowlHelperApp"
		register as application "Test" all notifications {"Alert"} default notifications {"Alert"} icon of application "GrowlHelperApp"
	end tell
end growlRegister

on growlNotify(grrTitle, grrDescription, grrPriority)
	tell application "GrowlHelperApp"
		notify with name "Alert" title grrTitle description grrDescription priority grrPriority application name "Test" -- image from location "file:///Users/Hischa/Pictures/Stuff/new_ava_2.jpg"
	end tell
end growlNotify