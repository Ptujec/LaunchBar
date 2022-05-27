#!/bin/sh

# Clear quarantine flag on every file passed
for f in "$@"
do
	xattr -dr com.apple.quarantine "$f"
done
