#!/bin/bash

#
# App Info Script for Fade LaunchBar Action
#
# by Christian Bender (@ptujec)
# 2026-07-12
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
