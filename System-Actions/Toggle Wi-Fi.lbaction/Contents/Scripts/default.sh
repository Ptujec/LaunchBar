#!/bin/sh
#
# Toggle Wifi Action for LaunchBar
# by Christian Bender (@ptujec)
# 2024-11-13
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

current_locale=$(defaults read -g AppleLocale)

if [[ "$current_locale" == de* ]]; then
  titleOn="WLAN ist eingeschaltet"
  titleOff="WLAN ist ausgeschaltet"
else
  titleOn="Wi-Fi is turned on"
  titleOff="Wi-Fi is turned off"
fi

wifi_device=$(networksetup -listallhardwareports | awk '/Wi-Fi/{getline; print $2}')

current_state=$(networksetup -getairportpower "$wifi_device" | awk '{print $NF}')

if [ "$current_state" = "On" ]; then
  networksetup -setairportpower en0 off
  printf '{"title":"%s","icon":"offTemplate", "action":"default.sh"}' "$titleOff"
else
  networksetup -setairportpower en0 on
  printf '{"title":"%s","icon":"onTemplate", "action":"default.sh"}' "$titleOn"
fi