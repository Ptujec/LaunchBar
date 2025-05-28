#!/bin/bash

# 
# YouTube Transcripts Action for LaunchBar
#
# Script to get the bundle ID of a supported browser that is running
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

frontmost=$(lsappinfo info -only bundleid `lsappinfo front` | cut -d'"' -f4)

# Check if frontmost app is in supported browsers
for browser in "${supported_browsers[@]}"; do
    if [[ "$browser" == "$frontmost" ]]; then
        echo "$frontmost"
        exit 0
    fi
done

# If frontmost is not a supported browser, check which supported browsers are running
for browser in "${supported_browsers[@]}"; do
    result=$(lsappinfo find "bundleid=$browser")
    if [[ ! -z "$result" ]]; then
        echo "$browser"
        exit 0
    fi
done

echo ""