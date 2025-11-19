#!/bin/bash
#
# StudyCards Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-11-19
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

set -euo pipefail 
IFS=$'\n\t'

DB_PATH="${HOME}/Library/Containers/com.cameronshemilt.StudyCards/Data/Library/Application Support/StudyCards/StudyCards.sqlite"

if [ ! -r "$DB_PATH" ]; then
    echo "Error: Cannot read StudyCards database at $DB_PATH"
    exit 0
fi

# Query all cards (questions and answers combined, sorted alphabetically)
results=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT 
        ZQUESTIONSTRING as title,
        ZANSWERSTRING as subtitle,
        'com.cameronshemilt.StudyCards' as icon,
        '1' as alwaysShowsSubtitle
    FROM ZQUESTION
    WHERE ZQUESTIONSTRING IS NOT NULL
    AND ZANSWERSTRING IS NOT NULL
    AND ZDELETIONDATE IS NULL
    UNION ALL
    SELECT 
        ZANSWERSTRING as title,
        ZQUESTIONSTRING as subtitle,
        'com.cameronshemilt.StudyCards' as icon,
        '1' as alwaysShowsSubtitle
    FROM ZQUESTION
    WHERE ZQUESTIONSTRING IS NOT NULL
    AND ZANSWERSTRING IS NOT NULL
    AND ZDELETIONDATE IS NULL
    ORDER BY title ASC;" 2>&1)

if [ $? -ne 0 ] || [ -z "$results" ]; then
    echo "Error querying cards: $results" >&2
    echo "[]"
    exit 0
fi

# Return the sorted results
echo "$results"