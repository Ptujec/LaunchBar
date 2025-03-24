#!/bin/bash
#
# Recent Notes Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-24
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

set -euo pipefail  # Enhanced error handling
IFS=$'\n\t'

DB_PATH="$1"

if [ ! -r "$DB_PATH" ]; then
    echo "Error: Cannot read Notes database at $DB_PATH"
    exit 1
fi

notes=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT 
        ZTITLE1 as title,
        ZIDENTIFIER as id,
        datetime(ZMODIFICATIONDATE1 + 978307200, 'unixepoch') as modifiedAt,
        (SELECT ZTITLE2 FROM ZICCLOUDSYNCINGOBJECT f WHERE f.Z_PK = main.ZFOLDER) as folder
    FROM ZICCLOUDSYNCINGOBJECT main
    WHERE ZTITLE1 IS NOT NULL
    AND ZMARKEDFORDELETION != 1
    ORDER BY ZMODIFICATIONDATE1 DESC;" 2>&1)

if [ $? -ne 0 ]; then
    echo "Error querying notes: $notes" >&2
    notes="[]"
fi

echo "$notes"