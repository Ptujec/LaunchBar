-- https://stackoverflow.com/questions/19752438/applescript-to-toggle-bluetooth

on run
	getState()
end run

on getState()
	tell application "System Preferences"
		set current pane to pane "com.apple.preferences.Bluetooth"
		delay 0.5
	end tell
	
	tell application "System Events"
		tell application process "System Preferences"
			set _state to (value of static text 1 of window "Bluetooth") as string
			set _state to last word of _state as string
			
			set _title to "Bluetooth: " & _state
			
			if _state is in {"Aus", "Off"} then
				set _icon to "offTemplate"
			else if _state is in {"Ein", "On"} then
				set _icon to "onTemplate"
			end if
		end tell
	end tell
	
	set output to {title:_title, icon:_icon, action:"toggle"}
end getState

on toggle()
	tell application "System Events"
		tell application process "System Preferences"
			click button 1 of window "Bluetooth"
		end tell
	end tell
	--tell application "System Preferences" to quit
	getState()
end toggle