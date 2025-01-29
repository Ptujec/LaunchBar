#!/bin/sh
#
# Arc History Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-01-29
# 
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

if [ "$1" ]; then
    open -a "Arc" "$1" &
    osascript -e 'tell application "LaunchBar" to hide'
    exit 0
fi

history_path="${HOME}/Library/Application Support/Arc/User Data/Default/History"
tmp_history="/tmp/arc_history_tmp"

cp "${history_path}" "${tmp_history}"

query="SELECT DISTINCT u.title, u.url, u.last_visit_time
FROM urls u
LEFT JOIN visits v ON u.id = v.url
WHERE u.hidden = 0  -- Only show non-hidden URLs
  AND u.url NOT LIKE '%/oauth2/authorize%'  -- Filter out common OAuth redirects
  AND u.url NOT LIKE '%/auth?%'  -- Filter out common auth redirects
  AND u.url NOT LIKE '%/login/oauth%'  -- Filter out more OAuth patterns
  AND u.visit_count > 0  -- Ensure the URL has been visited
GROUP BY u.id
ORDER BY u.last_visit_time DESC
LIMIT 1000;"

sqlite3 -json "${tmp_history}" "${query}" | jq 'map({
    title: (if .title == null or .title == "" then .url else .title end),
    url: .url,
    subtitle: .url,
    alwaysShowsSubtitle: true,
    action: "default.sh",
    actionArgument: .url,
    actionRunsInBackground: true,
    icon: "URLTemplate"
})'

rm "${tmp_history}"
