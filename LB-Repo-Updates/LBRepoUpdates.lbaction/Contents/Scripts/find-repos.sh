#!/bin/bash

maxdepth="$1"
shift

for dir in "$@"; do
  find "$dir" -maxdepth "$maxdepth" -name .git -type d 2>/dev/null | while read -r gitdir; do
    echo $(dirname "$gitdir")
  done
done 