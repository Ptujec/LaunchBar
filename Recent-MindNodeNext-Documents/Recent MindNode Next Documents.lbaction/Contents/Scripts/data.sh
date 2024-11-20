#!/bin/sh
documents=$(sqlite3 -json "$1" "SELECT document.documentID, document.title FROM document WHERE document.trashDate IS NULL")
if [ -z "${documents}" ]; then
  documents="[]"
fi
assets=$(stat -f "%Sm %N" "$2"*)
echo "${documents}////${assets}"