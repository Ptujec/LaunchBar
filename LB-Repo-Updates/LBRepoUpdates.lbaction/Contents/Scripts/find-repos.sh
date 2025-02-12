#!/bin/bash

for dir in "$@"; do
  find "$dir" -maxdepth 4 -name .git -type d 2>/dev/null | while read -r gitdir; do
    echo $(dirname "$gitdir")
  done
done 