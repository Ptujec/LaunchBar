#!/bin/sh

# Get the modification timestamps of both files
file1_modified=$(stat -f "%m" "${HOME}/Zotero/zotero.sqlite")
file2_modified=$(stat -f "%m" "${HOME}/Zotero/zotero.sqlite-copy")

# Compare the timestamps and exit if zotero.sqlite is not newer and if the passed argement is not true (It might be true if there is a new version of the action or if the JSON file has been removed)

if [ $1 != "true" ] && [ "$file1_modified" -le "$file2_modified" ]; then
  exit 1
fi

cp "${HOME}/Zotero/zotero.sqlite" "${HOME}/Zotero/zotero.sqlite-copy"
database_path="${HOME}/Zotero/zotero.sqlite-copy"

# Query the database
itemTypes=$(sqlite3 -json "${database_path}" "
SELECT itemTypes.itemTypeID, itemTypes.typeName FROM itemTypes")

items=$(sqlite3 -json "${database_path}" "
SELECT items.itemID, items.itemTypeID, items.key FROM items")

itemNotes=$(sqlite3 -json "${database_path}" "
SELECT itemNotes.itemID, itemNotes.parentItemID, itemNotes.note FROM itemNotes")
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
")
if [ -z "${itemTags}" ]; then
  itemTags="[]"
fi

creators=$(sqlite3 -json "${database_path}" "
SELECT creators.creatorID, creators.lastName, creators.firstName FROM creators")

itemCreators=$(sqlite3 -json "${database_path}" "
SELECT itemCreators.itemID, itemCreators.creatorID, itemCreators.creatorTypeID, creators.lastName, creators.firstName FROM itemCreators
LEFT JOIN creators ON itemCreators.creatorID = creators.creatorID
")

collections=$(sqlite3 -json "${database_path}" "
SELECT collections.collectionID, collections.collectionName FROM collections")
if [ -z "${collections}" ]; then
  collections="[]"
fi

collectionItems=$(sqlite3 -json "${database_path}" "
SELECT  collectionItems.collectionID,  collections.collectionName, collectionItems.itemID FROM collectionItems
LEFT JOIN collections ON collectionItems.collectionID = collections.collectionID
")
if [ -z "${collectionItems}" ]; then
  collectionItems="[]"
fi

deletedItems=$(sqlite3 -json "${database_path}" "
SELECT deletedItems.itemID FROM deletedItems")
if [ -z "${deletedItems}" ]; then
  deletedItems="[]"
fi

metaAll=$(sqlite3 -json "${database_path}" "
SELECT  itemData.itemID, itemData.fieldID,  
        itemDataValues.value
FROM itemData
LEFT JOIN fields ON itemData.fieldID = fields.fieldID
LEFT JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
")

# only titles and dates
meta=$(sqlite3 -json "${database_path}" "
SELECT  itemData.itemID, itemData.fieldID,  
        itemDataValues.value
FROM itemData
LEFT JOIN fields ON itemData.fieldID = fields.fieldID
LEFT JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
WHERE itemData.fieldID = 14 OR itemData.fieldID = 110
")

printf '{"itemTypes": %s, "items": %s, "itemNotes": %s, "itemAttachments": %s, "tags": %s, "itemTags": %s, "creators": %s, "itemCreators": %s, "collections": %s, "collectionItems": %s, "deletedItems": %s, "metaAll": %s, "meta": %s}' "${itemTypes}" "${items}" "${itemNotes}" "${itemAttachments}" "${tags}" "${itemTags}" "${creators}" "${itemCreators}" "${collections}" "${collectionItems}" "${deletedItems}" "${metaAll}" "${meta}"