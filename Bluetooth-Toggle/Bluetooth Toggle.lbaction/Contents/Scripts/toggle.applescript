(* 
Bluetooth Toggle Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-28

Tested on macOS 15.3.1

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

on run
	tell application "System Settings"
		reveal pane id "com.apple.BluetoothSettings"
	end tell
	
	try
		tell application "System Events"
			set startTime to current date
			set timeoutSeconds to 3
			
			repeat until (exists window 1 of application process "System Settings")
				if (current date) - startTime ≥ timeoutSeconds then
					exit repeat
				end if
				delay 0.1
			end repeat
			
			
			tell application "System Settings"
				repeat until (id of current pane is "com.apple.BluetoothSettings")
					if (current date) - startTime ≥ timeoutSeconds then
						exit repeat
					end if
					delay 0.1
				end repeat
			end tell
			
			click checkbox 1 of group 1 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Bluetooth" of application process "System Settings"
			
		end tell
	end try

  delay 0.5
end run
