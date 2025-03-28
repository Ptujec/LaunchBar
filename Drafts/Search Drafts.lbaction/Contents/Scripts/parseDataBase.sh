#!/bin/bash
#
# Recent Drafts Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-24
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

set -euo pipefail # Enhanced error handling
IFS=$'\n\t'

DB_PATH="$1"
SEARCH_TERM="$2"

if [ ! -r "$DB_PATH" ]; then
  echo "Error: Cannot read Drafts database at $DB_PATH"
  exit 1
fi

# Escape special characters in search term for SQLite
ESCAPED_TERM=$(echo "$SEARCH_TERM" | sed 's/"/""/g')

drafts=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT 
        ZCONTENT as content,
        ZUUID as id,
        ZFLAGGED as flag
    FROM ZMANAGEDDRAFT
    WHERE ZHIDDEN != 1
    AND ZFOLDER != 10000
    AND (
        ZCONTENT LIKE '%' || '$ESCAPED_TERM' || '%'
        OR ZTITLE LIKE '%' || '$ESCAPED_TERM' || '%'
    )
    ORDER BY ZACCESSED_AT DESC;" 2>&1)

if [ $? -ne 0 ] || [ -z "$drafts" ]; then
  echo "Error querying drafts: $drafts" >&2
  echo "[]"
  exit 0
fi

echo "$drafts"
