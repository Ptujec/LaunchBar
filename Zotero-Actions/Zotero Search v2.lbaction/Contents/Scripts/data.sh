#!/bin/sh
cp "${HOME}/Zotero/zotero.sqlite" "${HOME}/Zotero/zotero.sqlite-copy"
database_path="${HOME}/Zotero/zotero.sqlite-copy"

# Query the database
itemTypes=$(sqlite3 -json "${database_path}" "
SELECT itemTypes.itemTypeID, itemTypes.typeName FROM itemTypes")

items=$(sqlite3 -json "${database_path}" "
SELECT items.itemID, items.itemTypeID, items.key FROM items")

itemDataValues=$(sqlite3 -json "${database_path}" "
SELECT itemDataValues.valueID, itemDataValues.value FROM itemDataValues")

itemData=$(sqlite3 -json "${database_path}" "
SELECT itemData.itemID, itemData.fieldID, itemData.valueID FROM itemData")

itemNotes=$(sqlite3 -json "${database_path}" "
SELECT itemNotes.itemID, itemNotes.parentItemID, itemNotes.note FROM itemNotes")

itemAttachments=$(sqlite3 -json "${database_path}" "
SELECT itemAttachments.itemID, itemAttachments.parentItemID, itemAttachments.contentType, itemAttachments.path FROM itemAttachments")

tags=$(sqlite3 -json "${database_path}" "
SELECT tags.name AS title, tags.tagID  FROM tags")

itemTags=$(sqlite3 -json "${database_path}" "
SELECT itemTags.itemID, itemTags.tagID FROM itemTags")

creators=$(sqlite3 -json "${database_path}" "
SELECT creators.creatorID, creators.lastName, creators.firstName FROM creators")

itemCreators=$(sqlite3 -json "${database_path}" "
SELECT itemCreators.itemID, itemCreators.creatorID FROM itemCreators")

collections=$(sqlite3 -json "${database_path}" "
SELECT collections.collectionID, collections.collectionName FROM collections")

collectionItems=$(sqlite3 -json "${database_path}" "
SELECT collectionItems.collectionID, collectionItems.itemID FROM collectionItems")

deletedItems=$(sqlite3 -json "${database_path}" "
SELECT deletedItems.itemID FROM deletedItems")

# Print formated as JSON
printf '{"itemTypes": %s, "items": %s, "itemDataValues": %s, "itemData": %s, "itemNotes": %s, "itemAttachments": %s, "tags": %s, "itemTags": %s, "creators": %s, "itemCreators": %s, "collections": %s, "collectionItems": %s, "deletedItems": %s}' "${itemTypes}" "${items}" "${itemDataValues}" "${itemData}" "${itemNotes}" "${itemAttachments}" "${tags}" "${itemTags}" "${creators}" "${itemCreators}" "${collections}" "${collectionItems}" "${deletedItems}"
