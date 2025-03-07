#!/bin/bash
# 
# LB Repo Updates Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-06
# 
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
# 

maxdepth="$1"
shift

for dir in "$@"; do
  find "$dir" -maxdepth "$maxdepth" -name .git -type d 2>/dev/null | while read -r gitdir; do
    echo $(dirname "$gitdir")
  done
done 