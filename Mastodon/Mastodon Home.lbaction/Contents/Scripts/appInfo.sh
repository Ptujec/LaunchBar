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
)

front_app=$(lsappinfo front)
frontmost=$(lsappinfo info -only bundleid "$front_app" | cut -d'"' -f4)
app_name=$(lsappinfo info -only name "$front_app" | cut -d'"' -f4)
is_supported="false"

# Check if frontmost app is in supported browsers
for browser in "${supported_browsers[@]}"; do
    if [[ "$browser" == "$frontmost" ]]; then
        is_supported="true"
        break
    fi
done

echo "$frontmost"
echo "$app_name"
echo "$is_supported"