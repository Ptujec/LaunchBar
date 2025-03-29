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
ENCODED_SEARCH="$2"

# URL-encoded for proper handling charachters like üöä and ščž … it seems there is problem in how the argument is passed from js to the shell script
urldecode() {
  local url_encoded="${1//+/ }"
  printf '%b' "${url_encoded//%/\\x}"
}

SEARCH_TERM=$(urldecode "$ENCODED_SEARCH")

if [ ! -r "$DB_PATH" ]; then
  echo "Error: Cannot read Drafts database at $DB_PATH"
  exit 1
fi

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
