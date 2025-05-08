#!/bin/sh
#
# Brave History Action for LaunchBar
# by Christian Bender (@ptujec)
# 2024-03-19
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

# Add Homebrew paths if they exist
[ -d "/opt/homebrew/bin" ] && PATH="/opt/homebrew/bin:$PATH"
[ -d "/usr/local/bin" ] && PATH="/usr/local/bin:$PATH"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo '{"icon": "alert", "title": "You need macOS 15.2 or higher or manually install jq."}'
    exit 0
fi

if [ "$1" ]; then
    open -a "Brave Browser" "$1" &
    osascript -e 'tell application "LaunchBar" to hide'
    exit 0
fi

history_path="${HOME}/Library/Application Support/BraveSoftware/Brave-Browser/Default/History"

query="SELECT DISTINCT u.title, u.url, u.last_visit_time
FROM urls u
JOIN visits v ON u.id = v.url
WHERE v.visit_duration > 0  -- Filter out immediate redirects
  AND u.hidden = 0  -- Only show non-hidden URLs
  AND u.url NOT LIKE '%/oauth2/authorize%'  -- Filter out common OAuth redirects
  AND u.url NOT LIKE '%/auth?%'  -- Filter out common auth redirects
  AND u.url NOT LIKE '%/login/oauth%'  -- Filter out more OAuth patterns
GROUP BY u.id
ORDER BY u.last_visit_time DESC
LIMIT 1000;"

sqlite3 -readonly -json "${history_path}" "${query}" | jq 'map({
    title: (if .title == null or .title == "" then .url else .title end),
    url: .url,
    subtitle: .url,
    alwaysShowsSubtitle: true,
    action: "default.sh",
    actionArgument: .url,
    actionRunsInBackground: true,
    icon: "URLTemplate"
})'
