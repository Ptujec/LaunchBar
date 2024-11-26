#!/bin/sh
# 
# Recent MindNode Next Documents Action for LaunchBar
# by Christian Bender (@ptujec)
# 2024-11-26
# 
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
# 

documents=$(sqlite3 -json "$1" "
    SELECT 
        d.documentID,
        d.title,
        CASE 
            WHEN COALESCE(MAX(o.localModificationDate), MAX(o.serverModificationDate)) IS NULL 
            THEN COALESCE(d.localModificationDate, d.serverModificationDate)
            ELSE COALESCE(MAX(o.localModificationDate), MAX(o.serverModificationDate))
        END AS lastModifiedDate
    FROM 
        document d
    LEFT JOIN 
        operation o ON d.documentID = o.documentID
    WHERE
        d.trashDate IS NULL AND d.localDeletionDate IS NULL -- not trashed, and not marked for synced deletion
    GROUP BY 
        d.documentID
    ORDER BY
        lastModifiedDate DESC")

if [ -z "${documents}" ]; then
    documents="[]"
fi

assets=$(ls "$2" | jq -R -s -c 'split("\n")[:-1]')
echo "{\"documents\": $documents, \"assets\": $assets}"
