#!/bin/bash

# 
# App Info Script for LaunchBar Actions
#
# Script to get the bundle ID of a supported browser that is frontmost
#
# by Christian Bender (@ptujec)
# 2025-05-27
# 
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
# 

supported_browsers=(
    "com.apple.Safari"
    "com.brave.Browser"
    "com.google.Chrome"
    "com.vivaldi.Vivaldi"
    "company.thebrowser.Browser" # this browser is abandoned but maybe still used
    "org.mozilla.firefox"
    "app.zen-browser.zen"
)

front_app=$(lsappinfo front)
# macOS 27+ prints bundleID="..." (field 2); older versions print "CFBundleIdentifier"="..." (field 4)
macos_major=$(sw_vers -productVersion | cut -d. -f1)
if [ "$macos_major" -ge 27 ]; then
    app_id=$(lsappinfo info -only bundleid "$front_app" | grep 'bundleID=' | cut -d'"' -f2)
else
    app_id=$(lsappinfo info -only bundleid "$front_app" | cut -d'"' -f4)
fi

is_supported="false"

# Check if frontmost app is in supported browsers
for browser in "${supported_browsers[@]}"; do
    if [[ "$browser" == "$app_id" ]]; then
        is_supported="true"
        break
    fi
done

mail_running=$(lsappinfo info -only bundleID "com.apple.mail") # either as a value or undefined

echo "$app_id"
echo "$is_supported"
echo "$mail_running"