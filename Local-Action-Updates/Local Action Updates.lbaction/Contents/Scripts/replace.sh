#!/bin/sh
target="$1"
input="$2"

# Move a copy of the original .lbaction bundle to trash
cp -R "$target" ~/.Trash/ || { echo "Failed to backup to trash"; exit 1; }

# Remove and replace Contents folder
rm -rf "$target/Contents"
cp -R "$input/Contents" "$target/Contents" || { echo "Failed to copy new contents"; exit 1; }