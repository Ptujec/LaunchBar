-- http://macscripter.net/viewtopic.php?id=36576

# Toggle Airport Device On/Off
#
# This script will either turn on or off
# your AirPort card based on its current state.

# Fetch the name of your AirPort Device
set airPortDevice to do shell script "/usr/sbin/networksetup -listallhardwareports | grep -A1 'Wi-Fi' | tail -n 1 | awk '{print $2}'"

# Fetch the current state of the AirPort device
set airPortPower to do shell script ("networksetup -getairportpower " & airPortDevice & " | awk '{print $4}'")

if airPortPower is equal to "on" then
	toggleWifi("off", airPortDevice)
	set apStatus to false
else
	toggleWifi("on", airPortDevice)
	set apStatus to true
end if

on toggleWifi(value, device)
	do shell script ("/usr/sbin/networksetup -setairportpower " & device & " " & value)
end toggleWifi
