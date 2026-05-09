#!/bin/bash

#
# App Info Script for LaunchBar Actions
#
# Script to get the bundle ID of a supported browser that is frontmost
#
# by Christian Bender (@ptujec)
# 2026-05-05
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

sleep 0.02 # give LaunchBar time to hide
front_app=$(lsappinfo front)
frontmost=$(lsappinfo info -only bundleid "$front_app" | cut -d'"' -f4) # returns the bundle ID of the frontmost app
echo "$frontmost"
