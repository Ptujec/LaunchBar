#!/bin/sh

# Get the modification timestamps of both files
file1_modified=$(stat -f "%m" "$1")
file2_modified=$(stat -f "%m" "$1.launchbar")

# Compare the timestamps and exit if zotero.sqlite is not newer and if the passed argument is not true (It might be true if there is a new version of the action or if the JSON file has been removed)

if [ $2 != "true" ] && [ "$file1_modified" -le "$file2_modified" ]; then
  exit 1
fi

cp "$1" "$1.launchbar"
database_path="$1.launchbar"

# Query the database
itemTypes=$(sqlite3 -json "${database_path}" "
SELECT itemTypes.itemTypeID, itemTypes.typeName FROM itemTypes
")
if [ -z "${itemTypes}" ]; then
  itemTypes="[]"
fi

fields=$(sqlite3 -json "${database_path}" "
SELECT fields.fieldID, fields.fieldName FROM fields
")
if [ -z "${fields}" ]; then
  fields="[]"
fi

creatorTypes=$(sqlite3 -json "${database_path}" "
SELECT creatorTypes.creatorTypeID, creatorTypes.creatorType FROM creatorTypes
")
if [ -z "${creatorTypes}" ]; then
  creatorTypes="[]"
fi

items=$(sqlite3 -json "${database_path}" "
SELECT items.itemID, items.itemTypeID, itemTypes.typeName, items.key, items.libraryID FROM items
LEFT JOIN itemTypes ON items.itemTypeID = itemTypes.itemTypeID 
LEFT JOIN feedItems ON items.itemID = feedItems.itemID 
LEFT JOIN deletedItems ON items.itemID = deletedItems.itemID 
WHERE feedItems.itemID IS NULL AND deletedItems.itemID IS NULL
")
if [ -z "${items}" ]; then
  items="[]"
fi

itemNotes=$(sqlite3 -json "${database_path}" "
SELECT itemNotes.itemID, itemNotes.parentItemID, itemNotes.note, itemNotes.title FROM itemNotes
LEFT JOIN deletedItems ON itemNotes.itemID = deletedItems.itemID 
WHERE deletedItems.itemID IS NULL
")
if [ -z "${itemNotes}" ]; then
  itemNotes="[]"
fi

itemAttachments=$(sqlite3 -json "${database_path}" "
SELECT items.key, itemAttachments.itemID, itemAttachments.parentItemID, itemAttachments.contentType, itemAttachments.path 
FROM itemAttachments
LEFT JOIN items ON itemAttachments.itemID = items.itemID
LEFT JOIN deletedItems ON itemAttachments.itemID = deletedItems.itemID 
WHERE deletedItems.itemID IS NULL 
")
if [ -z "${itemAttachments}" ]; then
  itemAttachments="[]"
fi

tags=$(sqlite3 -json "${database_path}" "
SELECT tags.name AS title, tags.tagID  FROM tags")
if [ -z "${tags}" ]; then
  tags="[]"
fi

itemTags=$(sqlite3 -json "${database_path}" "
SELECT itemTags.itemID, itemTags.tagID, tags.name 
FROM itemTags
LEFT JOIN tags ON itemTags.tagID = tags.tagID
LEFT JOIN deletedItems ON itemTags.itemID = deletedItems.itemID 
WHERE deletedItems.itemID IS NULL 
")
if [ -z "${itemTags}" ]; then
  itemTags="[]"
fi

creators=$(sqlite3 -json "${database_path}" "
SELECT creators.creatorID, creators.lastName, creators.firstName FROM creators")
if [ -z "${creators}" ]; then
  creators="[]"
fi

itemCreators=$(sqlite3 -json "${database_path}" "
SELECT itemCreators.itemID, itemCreators.creatorID, itemCreators.creatorTypeID, creators.lastName, creators.firstName FROM itemCreators
LEFT JOIN creators ON itemCreators.creatorID = creators.creatorID
LEFT JOIN feedItems ON itemCreators.itemID = feedItems.itemID 
LEFT JOIN deletedItems ON itemCreators.itemID = deletedItems.itemID 
WHERE feedItems.itemID IS NULL AND deletedItems.itemID IS NULL
")
if [ -z "${itemCreators}" ]; then
  itemCreators="[]"
fi

collections=$(sqlite3 -json "${database_path}" "
SELECT collections.collectionID, collections.collectionName FROM collections")
if [ -z "${collections}" ]; then
  collections="[]"
fi

collectionItems=$(sqlite3 -json "${database_path}" "
SELECT  collectionItems.collectionID,  collections.collectionName, collectionItems.itemID FROM collectionItems
LEFT JOIN collections ON collectionItems.collectionID = collections.collectionID
LEFT JOIN deletedItems ON collectionItems.itemID = deletedItems.itemID 
WHERE deletedItems.itemID IS NULL 
")
if [ -z "${collectionItems}" ]; then
  collectionItems="[]"
fi

meta=$(sqlite3 -json "${database_path}" "
SELECT  itemData.itemID, itemData.fieldID,  
        itemDataValues.value
FROM itemData
LEFT JOIN fields ON itemData.fieldID = fields.fieldID
LEFT JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
LEFT JOIN feedItems ON itemData.itemID = feedItems.itemID 
LEFT JOIN deletedItems ON itemData.itemID = deletedItems.itemID 
WHERE feedItems.itemID IS NULL AND deletedItems.itemID IS NULL
")
if [ -z "${meta}" ]; then
  meta="[]"
fi

printf '{"itemTypes": %s, "fields": %s, "creatorTypes": %s, "items": %s, "itemNotes": %s, "itemAttachments": %s, "tags": %s, "itemTags": %s, "creators": %s, "itemCreators": %s, "collections": %s, "collectionItems": %s,  "meta": %s}' "${itemTypes}" "${fields}" "${creatorTypes}" "${items}" "${itemNotes}" "${itemAttachments}" "${tags}" "${itemTags}" "${creators}" "${itemCreators}" "${collections}" "${collectionItems}" "${meta}"
