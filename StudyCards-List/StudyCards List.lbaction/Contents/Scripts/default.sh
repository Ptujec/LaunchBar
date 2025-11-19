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
    echo "Error: Cannot read StudyCards database at $DB_PATH" >&2
    echo "[]"
    exit 1
fi

# Query all cards (questions and answers combined, sorted alphabetically)
results=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT 
        ZQUESTIONSTRING as title,
        ZANSWERSTRING as subtitle,
        'com.cameronshemilt.StudyCards' as icon,
        '1' as alwaysShowsSubtitle,
        ZCOURSE.ZNAME || '/ ' || ZCHAPTER.ZNAME as badge
    FROM ZQUESTION
    LEFT JOIN ZCHAPTER ON ZQUESTION.ZCHAPTER = ZCHAPTER.Z_PK
    LEFT JOIN ZCOURSE ON ZCHAPTER.ZCOURSE = ZCOURSE.Z_PK
    WHERE ZQUESTIONSTRING IS NOT NULL
    AND ZANSWERSTRING IS NOT NULL
    AND ZQUESTION.ZDELETIONDATE IS NULL
    UNION ALL
    SELECT 
        ZANSWERSTRING as title,
        ZQUESTIONSTRING as subtitle,
        'com.cameronshemilt.StudyCards' as icon,
        '1' as alwaysShowsSubtitle,
        ZCOURSE.ZNAME || '/ ' || ZCHAPTER.ZNAME as badge
    FROM ZQUESTION
    LEFT JOIN ZCHAPTER ON ZQUESTION.ZCHAPTER = ZCHAPTER.Z_PK
    LEFT JOIN ZCOURSE ON ZCHAPTER.ZCOURSE = ZCOURSE.Z_PK
    WHERE ZQUESTIONSTRING IS NOT NULL
    AND ZANSWERSTRING IS NOT NULL
    AND ZQUESTION.ZDELETIONDATE IS NULL
    ORDER BY title ASC;" 2>&1) || {
    echo "Error querying cards" >&2
    echo "[]"
    exit 1
}

if [ -z "$results" ]; then
    echo "Error: Empty results from query" >&2
    echo "[]"
    exit 1
fi

# Return the sorted results
echo "$results"