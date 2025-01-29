#!/bin/sh
#
# Firefox History Action for LaunchBar
# by Christian Bender (@ptujec)
# 2024-03-19
#
# This action was created with help from Phind.com
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

if [ "$1" ]; then
    # If URL is provided, open it in Firefox
    open -a "Firefox" "$1" &
    osascript -e 'tell application "LaunchBar" to hide'
    exit 0
fi

# Find the default Firefox profile directory
profile_dir=$(find "${HOME}/Library/Application Support/Firefox/Profiles" -name "*.default-release*" -type d | head -n 1)
history_path="${profile_dir}/places.sqlite"
tmp_history="/tmp/firefox_history_tmp"


cp "${history_path}" "${tmp_history}"

query="SELECT DISTINCT p.title, p.url, p.last_visit_date
FROM moz_places p
JOIN moz_historyvisits h ON p.id = h.place_id
WHERE p.hidden = 0
  AND p.url NOT LIKE '%/oauth2/authorize%'
  AND p.url NOT LIKE '%/auth?%'
  AND p.url NOT LIKE '%/login/oauth%'
GROUP BY p.id
ORDER BY p.last_visit_date DESC
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
