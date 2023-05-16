#!/bin/sh
#
# Arc History Action for LaunchBar
# by Christian Bender (@ptujec)
# 2023-05-16
#
# This action was created with help from Phind.com 
# 
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

# The database is copied so you can run this while Arc is running
cp "${HOME}/Library/Application Support/Arc/User Data/Default/History" "${HOME}/Library/Application Support/Arc/User Data/Default/History-copy"

history_path="${HOME}/Library/Application Support/Arc/User Data/Default/History-copy"

query="SELECT title, url FROM urls ORDER BY id DESC;"

result=$(sqlite3 -json "${history_path}" "${query}")

echo "${result}"