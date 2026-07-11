#!/bin/bash

#
# App Info Script for LaunchBar Actions
#
# Script to get the bundle ID of a supported browser that is frontmost
#
# by Christian Bender (@ptujec)
# 2026-07-07
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

running_apps=()

while IFS= read -r app; do
    app_running=$(lsappinfo info -only bundleID "$app")
    if [ -n "$app_running" ]; then
        running_apps+=("$app_running")
    fi
done <<< "$1"

if [ ${#running_apps[@]} -gt 0 ]; then
    printf '%s\n' "${running_apps[@]}"
fi
