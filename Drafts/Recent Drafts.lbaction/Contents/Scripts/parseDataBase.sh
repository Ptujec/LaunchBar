#!/bin/bash
#
# Recent Drafts Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-28
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

set -euo pipefail  # Enhanced error handling
IFS=$'\n\t'

DB_PATH="$1"

if [ ! -r "$DB_PATH" ]; then
    echo "Error: Cannot read Drafts database at $DB_PATH"
    exit 1
fi

drafts=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT 
        ZCONTENT as content,
        ZUUID as id,
        datetime(ZMODIFIED_AT + 978307200, 'unixepoch') as modifiedAt,
        ZFLAGGED as flag
    FROM ZMANAGEDDRAFT
    WHERE ZHIDDEN != 1
    AND ZFOLDER != 10000
    ORDER BY ZACCESSED_AT DESC;" 2>&1)

if [ $? -ne 0 ] || [ -z "$drafts" ]; then
    echo "Error querying drafts: $drafts" >&2
    echo "[]"
    exit 0
fi

echo "$drafts"