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

frontmost=$(lsappinfo info -only bundleid `lsappinfo front` | cut -d'"' -f4)

supported=$1

if [[ "$supported" == *"$frontmost"* ]]; then
    echo "$frontmost"
    exit 0
fi

IFS=',' read -ra SUPPORTED_APPS <<< "$supported"
for app in "${SUPPORTED_APPS[@]}"; do
    result=$(lsappinfo find "bundleid=$app")
    if [[ ! -z "$result" ]]; then
        echo "$app"
        exit 0
    fi
done

echo ""