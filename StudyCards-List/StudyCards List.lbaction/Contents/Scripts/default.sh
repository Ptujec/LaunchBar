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

# Temporary log file for error reporting
LOG_FILE="/tmp/studycards_action_$(date +%s).log"

DB_PATH="${HOME}/Library/Containers/com.cameronshemilt.StudyCards/Data/Library/Application Support/StudyCards/StudyCards.sqlite"

if [ ! -r "$DB_PATH" ]; then
    {
        echo "Error: Cannot read StudyCards database at $DB_PATH"
        echo "Timestamp: $(date)"
        echo "DB_PATH: $DB_PATH"
    } | tee "$LOG_FILE" >&2
    echo "[]"
    exit 0
fi

# Query all cards (questions and answers combined, sorted alphabetically)
results=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT 
        ZQUESTIONSTRING as title,
        ZANSWERSTRING as subtitle,
        'com.cameronshemilt.StudyCards' as icon,
        '1' as alwaysShowsSubtitle,
        ZCHAPTER.ZNAME as badge
    FROM ZQUESTION
    LEFT JOIN ZCHAPTER ON ZQUESTION.ZCHAPTER = ZCHAPTER.Z_PK
    WHERE ZQUESTIONSTRING IS NOT NULL
    AND ZANSWERSTRING IS NOT NULL
    AND ZQUESTION.ZDELETIONDATE IS NULL
    UNION ALL
    SELECT 
        ZANSWERSTRING as title,
        ZQUESTIONSTRING as subtitle,
        'com.cameronshemilt.StudyCards' as icon,
        '1' as alwaysShowsSubtitle,
        ZCHAPTER.ZNAME as badge
    FROM ZQUESTION
    LEFT JOIN ZCHAPTER ON ZQUESTION.ZCHAPTER = ZCHAPTER.Z_PK
    WHERE ZQUESTIONSTRING IS NOT NULL
    AND ZANSWERSTRING IS NOT NULL
    AND ZQUESTION.ZDELETIONDATE IS NULL
    ORDER BY title ASC;" 2>&1) || {
    {
        echo "Error querying cards"
        echo "Timestamp: $(date)"
        echo "Exit code: $?"
        echo "Query output: $results"
        echo "DB_PATH: $DB_PATH"
    } > "$LOG_FILE" 2>&1
    echo "[]"
    exit 0
}

if [ -z "$results" ]; then
    {
        echo "Error: Empty results from query"
        echo "Timestamp: $(date)"
    } > "$LOG_FILE" 2>&1
    echo "[]"
    exit 0
fi

# Return the sorted results
echo "$results"