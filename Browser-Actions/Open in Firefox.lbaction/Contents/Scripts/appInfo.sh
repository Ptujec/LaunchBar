#!/bin/bash

# 
# App Info Script for LaunchBar Actions
#
# Script to get the bundle ID of a supported browser that is frontmost
#
# by Christian Bender (@ptujec)
# 2026-11-08
# 
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
# 

supported_browsers=(
    "com.apple.Safari"
    "com.kagi.kagimacOS"
    "net.imput.helium@"
    "com.brave.Browser"
    "com.google.Chrome"
    "com.vivaldi.Vivaldi"
    "org.mozilla.firefox" 
    "app.zen-browser.zen"   
    "company.thebrowser.Browser" # this browser is abandoned but maybe still used
)

front_app=$(lsappinfo front)
macos_major=$(sw_vers -productVersion | cut -d. -f1)
if [ "$macos_major" -ge 27 ]; then
    app_id=$(lsappinfo info -only bundleid "$front_app" | grep 'bundleID="' | cut -d'"' -f2)
    app_name=$(lsappinfo info -only name "$front_app" | head -n 1 | cut -d'"' -f2)
else
    app_id=$(lsappinfo info -only bundleid "$front_app" | cut -d'"' -f4)
    app_name=$(lsappinfo info -only name "$front_app" | cut -d'"' -f4)
fi

is_supported="false"

# Check if frontmost app is in supported browsers
for browser in "${supported_browsers[@]}"; do
    if [[ "$browser" == "$app_id" ]]; then
        is_supported="true"
        break
    fi
done

echo "$app_id"
echo "$app_name"
echo "$is_supported"