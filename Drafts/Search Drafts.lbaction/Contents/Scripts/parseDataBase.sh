#!/bin/bash
#
# Recent Drafts Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-24
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

set -euo pipefail  # Enhanced error handling
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
        CASE 
            WHEN INSTR(ZCONTENT, char(10)) > 0 
            THEN SUBSTR(ZCONTENT, 1, INSTR(ZCONTENT, char(10)) - 1)
            ELSE SUBSTR(ZCONTENT, 1, 30)
        END as title,
        ZUUID as id,
        datetime(ZACCESSED_AT + 978307200, 'unixepoch') as accessedAt,
        ZFLAGGED as flagged,
        ZFOLDER as folder,
        ZCONTENT as content
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