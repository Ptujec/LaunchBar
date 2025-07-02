#!/bin/bash

#log_execution_time() {
#  start_time=$(date +%s.%N)
#  "$@"
#  end_time=$(date +%s.%N)
#  execution_time=$(echo "$end_time - $start_time" | bc)
#  echo "$(date '+%Y-%m-%d %H:%M:%S') - Execution time: ${execution_time} seconds" >>/tmp/zotero_search.log
#}

main() {
  cp "$1" "$1.launchbar"
  database_path="$1.launchbar"

  sqlite3 "${database_path}" "
  WITH 
  itemTypes_json AS (
    SELECT json_group_array(
      json_object('itemTypeID', itemTypeID, 'typeName', typeName)
    ) AS data
    FROM itemTypes
  ),
  fields_json AS (
    SELECT json_group_array(
      json_object('fieldID', fieldID, 'fieldName', fieldName)
    ) AS data
    FROM fields
  ),
  creatorTypes_json AS (
    SELECT json_group_array(
      json_object('creatorTypeID', creatorTypeID, 'creatorType', creatorType)
    ) AS data
    FROM creatorTypes
  ),
  items_json AS (
    SELECT json_group_array(
      json_object(
        'itemID', i.itemID, 
        'itemTypeID', i.itemTypeID, 
        'typeName', it.typeName, 
        'key', i.key, 
        'libraryID', i.libraryID
      )
    ) AS data
    FROM items i
    LEFT JOIN itemTypes it ON i.itemTypeID = it.itemTypeID 
    WHERE i.itemID NOT IN (SELECT itemID FROM feedItems)
    AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
  ),
  itemNotes_json AS (
    SELECT json_group_array(
      json_object(
        'itemID', itemID, 
        'parentItemID', parentItemID, 
        'note', note, 
        'title', title
      )
    ) AS data
    FROM itemNotes
    WHERE itemID NOT IN (SELECT itemID FROM deletedItems)
  ),
  itemAttachments_json AS (
    SELECT json_group_array(
      json_object(
        'key', i.key,
        'itemID', ia.itemID, 
        'parentItemID', ia.parentItemID, 
        'contentType', ia.contentType, 
        'path', ia.path
      )
    ) AS data
    FROM itemAttachments ia
    LEFT JOIN items i ON ia.itemID = i.itemID
    WHERE ia.itemID NOT IN (SELECT itemID FROM deletedItems)
  ),
  tags_json AS (
    SELECT json_group_array(
      json_object('title', name, 'tagID', tagID)
    ) AS data
    FROM tags
  ),
  itemTags_json AS (
    SELECT json_group_array(
      json_object(
        'itemID', it.itemID, 
        'tagID', it.tagID, 
        'name', t.name
      )
    ) AS data
    FROM itemTags it
    LEFT JOIN tags t ON it.tagID = t.tagID
    WHERE it.itemID NOT IN (SELECT itemID FROM deletedItems)
  ),
  creators_json AS (
    SELECT json_group_array(
      json_object(
        'creatorID', creatorID, 
        'lastName', lastName, 
        'firstName', firstName
      )
    ) AS data
    FROM creators
  ),
  itemCreators_json AS (
    SELECT json_group_array(
      json_object(
        'itemID', ic.itemID, 
        'creatorID', ic.creatorID, 
        'creatorTypeID', ic.creatorTypeID, 
        'lastName', c.lastName, 
        'firstName', c.firstName
      )
    ) AS data
    FROM itemCreators ic
    LEFT JOIN creators c ON ic.creatorID = c.creatorID
    WHERE ic.itemID NOT IN (SELECT itemID FROM feedItems)
    AND ic.itemID NOT IN (SELECT itemID FROM deletedItems)
  ),
  collections_json AS (
    SELECT json_group_array(
      json_object('collectionID', collectionID, 'collectionName', collectionName)
    ) AS data
    FROM collections
    WHERE collectionID NOT IN (SELECT collectionID FROM deletedCollections)
  ),
  collectionItems_json AS (
    SELECT json_group_array(
      json_object(
        'collectionID', ci.collectionID, 
        'collectionName', c.collectionName, 
        'itemID', ci.itemID
      )
    ) AS data
    FROM collectionItems ci
    LEFT JOIN collections c ON ci.collectionID = c.collectionID
    WHERE ci.itemID NOT IN (SELECT itemID FROM deletedItems)
  ),
  meta_json AS (
    SELECT json_group_array(
      json_object(
        'itemID', itemData.itemID, 
        'fieldID', itemData.fieldID, 
        'value', itemDataValues.value
      )
    ) AS data
    FROM itemData
    LEFT JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
    WHERE itemData.itemID NOT IN (SELECT itemID FROM feedItems)
    AND itemData.itemID NOT IN (SELECT itemID FROM deletedItems)
  ),
  annotations_json AS (
    SELECT json_group_array(
      json_object(
        'mainItemID', att.parentItemID,
        'annotationKey', i_ann.key,
        'attachmentKey', i_att.key,
        'itemID', ann.itemID,
        'attachmentID', ann.parentItemID,
        'type', ann.type,
        'text', ann.text,
        'comment', ann.comment,
        'pageLabel', ann.pageLabel,
        'sortIndex', ann.sortIndex,
        'position', ann.position
      )
    ) AS data
    FROM itemAnnotations ann
    LEFT JOIN items i_ann ON ann.itemID = i_ann.itemID
    LEFT JOIN itemAttachments att ON ann.parentItemID = att.itemID
    LEFT JOIN items i_att ON att.itemID = i_att.itemID
    WHERE ann.itemID NOT IN (SELECT itemID FROM deletedItems)
  )
  SELECT json_object(
    'itemTypes', COALESCE(json(itemTypes_json.data), '[]'),
    'fields', COALESCE(json(fields_json.data), '[]'),
    'creatorTypes', COALESCE(json(creatorTypes_json.data), '[]'),
    'items', COALESCE(json(items_json.data), '[]'),
    'itemNotes', COALESCE(json(itemNotes_json.data), '[]'),
    'itemAttachments', COALESCE(json(itemAttachments_json.data), '[]'),
    'tags', COALESCE(json(tags_json.data), '[]'),
    'itemTags', COALESCE(json(itemTags_json.data), '[]'),
    'creators', COALESCE(json(creators_json.data), '[]'),
    'itemCreators', COALESCE(json(itemCreators_json.data), '[]'),
    'collections', COALESCE(json(collections_json.data), '[]'),
    'collectionItems', COALESCE(json(collectionItems_json.data), '[]'),
    'meta', COALESCE(json(meta_json.data), '[]'),
    'annotations', COALESCE(json(annotations_json.data), '[]')
  )
  FROM 
    itemTypes_json,
    fields_json,
    creatorTypes_json,
    items_json,
    itemNotes_json,
    itemAttachments_json,
    tags_json,
    itemTags_json,
    creators_json,
    itemCreators_json,
    collections_json,
    collectionItems_json,
    meta_json,
    annotations_json;
  "
}

# Run the main function with timing
#log_execution_time main "$@"
main "$@"
