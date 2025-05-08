#!/bin/sh
#
# Recent Zed Workspaces Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-05-08
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

# Error handling
set -e

# Add Homebrew paths if they exist
[ -d "/opt/homebrew/bin" ] && PATH="/opt/homebrew/bin:$PATH"
[ -d "/usr/local/bin" ] && PATH="/usr/local/bin:$PATH"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo '{"icon": "alert", "title": "You need macOS 15.2 or higher or manually install jq."}'
    exit 0
fi

# Check if database exists
db_path="${HOME}/Library/Application Support/Zed/db/0-stable/db.sqlite"
if [ ! -f "${db_path}" ]; then
    echo '{"icon": "alert", "title": "Zed database not found"}'
    exit 1
fi

# Handle workspace opening
if [ "$1" ]; then
    if [ "$LB_OPTION_COMMAND_KEY" = "1" ]; then
        open -R "$1"
    else
        open -b "dev.zed.Zed" "$1" &
    fi
    osascript -e 'tell application "LaunchBar" to hide'
    exit 0
fi

# Query workspaces
query="SELECT local_paths_array
FROM workspaces
WHERE local_paths_array IS NOT NULL
AND trim(local_paths_array) != ''
ORDER BY timestamp DESC;"

# Execute query and format results for LaunchBar
sqlite3 -readonly -json "${db_path}" "${query}" | jq '
  map(
    .local_paths_array |
    split("\n")[0] |
    select(length > 0) |
    {
      title: split("/")[-1],
      subtitle: .,
      path: .,
      icon: "dev.zed.Zed",
      action: "default.sh",
      actionArgument: .,
      actionRunsInBackground: true
    }
  )' || {
    # If jq fails, show error message
    echo '[{"title": "Error processing workspaces", "icon": "alert"}]'
    exit 1
}
