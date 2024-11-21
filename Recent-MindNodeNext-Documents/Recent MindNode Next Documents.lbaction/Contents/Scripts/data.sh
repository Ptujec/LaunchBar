#!/bin/sh
documents=$(sqlite3 -json "$1" "SELECT -- last modified dates consider the document (metadata) and all contributing operations' modification dates
    d.documentID,
    d.title,
    MAX(
        COALESCE(d.localModificationDate, '0001-01-01'),
        COALESCE(d.serverModificationDate, '0001-01-01'),
        COALESCE(MAX(o.localModificationDate), '0001-01-01'),
        COALESCE(MAX(o.serverModificationDate), '0001-01-01')
    ) AS lastModifiedDate
FROM 
    document d
LEFT JOIN 
    operation o
ON 
    d.documentID = o.documentID
WHERE
    d.trashDate IS NULL AND d.localDeletionDate IS NULL -- not trashed, and not marked for synced deletion
GROUP BY 
    d.documentID
ORDER BY
    lastModifiedDate DESC")
if [ -z "${documents}" ]; then
  documents="[]"
fi

# assets=$(stat -f "%Sm %N" "$2"*)
assets=$(ls -A "$2")
echo "${documents}////${assets}"


