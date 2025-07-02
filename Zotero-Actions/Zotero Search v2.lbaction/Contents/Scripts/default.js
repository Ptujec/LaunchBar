/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('global.js');
include('citation.js');

function run(argument) {
  // Show Settings
  if (LaunchBar.options.alternateKey) return settings();

  if (!argument) return browse();
  return search(argument);
}

// SEARCH

function search(argument) {
  const data = loadData();

  argument = argument.toLowerCase();

  const getLowerCaseCreatorName = (item) =>
    `${item.firstName.toLowerCase()} ${item.lastName.toLowerCase()}`;

  const creatorIDs = new Set();
  for (const item of data.creators) {
    if (getLowerCaseCreatorName(item).includes(argument)) {
      creatorIDs.add(item.creatorID);
    }
  }

  const itemCreatorsIDs = new Set();
  for (const item of data.itemCreators) {
    if (creatorIDs.has(item.creatorID)) {
      itemCreatorsIDs.add(item.itemID);
    }
  }

  const itemTagsIDs = new Set();
  for (const item of data.itemTags) {
    if (item.name.toLowerCase().includes(argument)) {
      itemTagsIDs.add(item.itemID);
    }
  }

  const collectionIDs = new Set();
  for (const item of data.collectionItems) {
    if (item.collectionName.toLowerCase().includes(argument)) {
      collectionIDs.add(item.itemID);
    }
  }

  // Search all Fields (including title, place, publisher, isbn)
  const words = argument.split(' ');
  const wordMap = new Map(words.map((word) => [word, true]));

  const metaIDs = new Set();
  for (const item of data.meta) {
    const value = item.value.toLowerCase();
    if ([...wordMap.keys()].every((word) => value.includes(word))) {
      metaIDs.add(item.itemID);
    }
  }

  const itemNotesIDs = new Set();
  for (const item of data.itemNotes) {
    const note = item.note.toLowerCase();
    if (note.includes(argument)) {
      itemNotesIDs.add(item.parentItemID);
    }
  }

  const annotationIDs = new Set();
  for (const ann of data.annotations) {
    const text = (ann.text || '').toLowerCase();
    const comment = (ann.comment || '').toLowerCase();
    if (text.includes(argument) || comment.includes(argument)) {
      annotationIDs.add(ann.mainItemID);
    }
  }

  const allReversedItemIDs = new Set([
    ...[...itemCreatorsIDs].reverse(),
    ...[...itemTagsIDs].reverse(),
    ...[...collectionIDs].reverse(),
    ...[...metaIDs].reverse(),
    ...[...itemNotesIDs].reverse(),
    ...[...annotationIDs].reverse(),
  ]);

  if (allReversedItemIDs.size === 0 || LaunchBar.options.commandKey) {
    const storageResults = searchInStorageDir(argument) || [];
    for (const id of storageResults) {
      allReversedItemIDs.add(id);
    }
  }

  const result = showEntries(Array.from(allReversedItemIDs));

  if (result.length === 0) {
    return [
      {
        title: 'No results. Press enter to browse all items.',
        icon: 'alert',
        action: 'browse',
        actionArgument: data,
        actionReturnsItems: true,
      },
    ];
  }

  return result;
}

function searchInStorageDir(argument) {
  const output = LaunchBar.execute(
    '/usr/bin/mdfind',
    '-onlyin',
    storageDirectory,
    argument
  )
    .trim()
    .split('\n');

  if (output.length === 0 || output[0] === '') {
    return [];
  }

  const data = loadData();

  const attachmentMap = new Map();
  for (const item of data.itemAttachments) {
    attachmentMap.set(item.key, [
      ...(attachmentMap.get(item.key) || []),
      item.parentItemID,
    ]);
  }

  const itemIDs = new Set(
    output.flatMap((path) => {
      // Find the storage key by using the storage directory as reference
      const relativePath = path.replace(storageDirectory, '');
      const key = relativePath.split('/')[0];
      return attachmentMap.get(key) || [];
    })
  );

  return itemIDs;
}

// BROWSE
function browse() {
  checkAndUpdateData();

  const result = Action.preferences.recentItems
    ? showEntries(Action.preferences.recentItems || []).reverse()
    : [];

  result.push(
    {
      title: 'Creators',
      icon: 'creatorTemplate',
      action: 'showCreators',
      actionReturnsItems: true,
    },
    {
      title: 'Tags',
      icon: 'tagTemplate',
      action: 'showTags',
      actionReturnsItems: true,
    },
    {
      title: 'Collections',
      icon: 'collectionTemplate',
      action: 'showCollections',
      actionReturnsItems: true,
    },
    {
      title: 'All Items',
      icon: 'libraryTemplate',
      action: 'showAllItems',
      actionReturnsItems: true,
    }
  );

  return result;
}

function showTags() {
  const data = loadData();

  const tags = data.tags.map((item) => {
    return {
      ...item,
      icon: 'tagTemplate',
      action: 'showItemsWithTag',
      actionReturnsItems: true,
      actionArgument: item.tagID.toString(),
    };
  });
  return tags.sort((a, b) => a.title.localeCompare(b.title));
}

function showItemsWithTag(tagIDString) {
  const tagID = parseInt(tagIDString);
  const data = File.readJSON(dataPath);

  const itemIDs = [];
  for (const item of data.itemTags) {
    if (item.tagID == tagID) {
      itemIDs.push(item.itemID);
    }
  }

  return showEntries(itemIDs.reverse());
}

function showCreators() {
  const data = loadData();

  const creatorsMap = data.itemCreators.reduce(
    (acc, { firstName, lastName, creatorID }) => {
      const title = lastName + (firstName ? `, ${firstName}` : '');
      if (!acc.has(title)) {
        acc.set(title, {
          title,
          icon: 'creatorTemplate',
          action: 'showItemsWithCreator',
          actionReturnsItems: true,
          actionArgument: creatorID.toString(),
        });
      }
      return acc;
    },
    new Map()
  );

  return (results = Array.from(creatorsMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  ));
}

function showItemsWithCreator(creatorIDString) {
  const creatorID = parseInt(creatorIDString);
  const data = loadData();

  const itemIDs = [];
  for (const item of data.itemCreators) {
    if (item.creatorID === creatorID && !itemIDs.includes(item.itemID)) {
      itemIDs.push(item.itemID);
    }
  }

  return showEntries(itemIDs.reverse());
}

function showCollections() {
  const data = loadData();

  return data.collections
    .map(({ collectionName, collectionID }) => ({
      title: collectionName,
      icon: 'collectionTemplate',
      action: 'showItemsWithCollection',
      actionArgument: {
        collectionID: collectionID,
      },
      actionReturnsItems: true,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function showItemsWithCollection({ collectionID }) {
  const data = loadData();

  const itemIDs = [];
  for (const item of data.collectionItems) {
    if (item.collectionID == collectionID) {
      itemIDs.push(item.itemID);
    }
  }

  return showEntries(itemIDs.reverse());
}

function showAllItems() {
  const data = loadData();
  const fields = Action.preferences.fields;

  const itemIDs = new Set();
  for (const item of data.meta) {
    if (
      item.fieldID == fields.title ||
      item.fieldID == fields.caseName ||
      item.fieldID == fields.nameOfAct ||
      item.fieldID == fields.subject
    ) {
      itemIDs.add(item.itemID);
    }
  }

  return showEntries([...itemIDs].reverse());
}

function showEntries(itemIDs) {
  const prefs = Action.preferences;
  const itemTypes = prefs.itemTypes;
  const fields = prefs.fields;
  const creatorTypes = prefs.creatorTypes;

  const data = loadData();

  const itemsMap = new Map();
  const attachmentItemIDs = new Set();
  for (const item of data.items) {
    if (
      item.itemTypeID == itemTypes.attachment ||
      item.itemTypeID == itemTypes.note
    ) {
      attachmentItemIDs.add(item.itemID);
    } else {
      itemsMap.set(item.itemID, {
        zoteroSelectURL: `zotero://select/items/${item.libraryID}_${item.key}`,
        itemKey: item.key,
        typeName: item.typeName,
      });
    }
  }

  const itemCreatorsMap = new Map();
  for (const {
    itemID,
    lastName,
    firstName,
    creatorTypeID,
    creatorID,
  } of data.itemCreators) {
    if (!itemCreatorsMap.has(itemID)) {
      itemCreatorsMap.set(itemID, []);
    }
    itemCreatorsMap.get(itemID).push({
      name: [lastName, firstName ? initializeName(firstName) : '']
        .filter(Boolean)
        .join(', '),
      lastName,
      typeID: creatorTypeID,
      creatorID,
    });
  }

  const titleMap = new Map();
  const dateMap = new Map();
  for (const { itemID, fieldID, value } of data.meta) {
    if (
      fieldID == fields.title ||
      fieldID == fields.caseName ||
      fieldID == fields.nameOfAct ||
      fieldID == fields.subject
    ) {
      titleMap.set(itemID, value);
    } else if (fieldID == fields.date) {
      dateMap.set(itemID, value.split('-')[0]);
    }
  }

  // Pre-define template icons set
  const templateIcons = new Set([
    'interview',
    'film',
    'bill',
    'case',
    'hearing',
    'forumPost',
    'audioRecording',
    'videoRecording',
    'radioBroadcast',
    'podcast',
    'attachment',
  ]);

  return itemIDs
    .filter((itemID) => itemsMap.has(itemID) && !attachmentItemIDs.has(itemID))
    .map((itemID) => {
      const itemData = itemsMap.get(itemID);
      const iconBase = itemData.typeName || 'document';
      const icon = templateIcons.has(iconBase)
        ? `${iconBase}Template`
        : iconBase;

      const creators = itemCreatorsMap.get(itemID) || [];
      const hasAuthor = creators.some((c) => c.typeID === creatorTypes.author);
      const hasEditor = creators.some((c) => c.typeID === creatorTypes.editor);

      const filteredCreators = creators.filter((creator) =>
        hasAuthor
          ? creator.typeID === creatorTypes.author
          : hasEditor
          ? creator.typeID === creatorTypes.editor
          : true
      );

      const creatorString =
        filteredCreators.length > 3
          ? `${filteredCreators[0].lastName} et al.`
          : filteredCreators.length === 3
          ? `${filteredCreators[0].lastName}, ${filteredCreators[1].lastName} & ${filteredCreators[2].lastName}`
          : filteredCreators.length === 2
          ? filteredCreators.map((c) => c.lastName).join(' & ')
          : filteredCreators.length === 1
          ? filteredCreators[0].name
          : '';

      const title = titleMap.get(itemID);
      const date = dateMap.get(itemID) || '';
      const subtitle = (creatorString ? creatorString + ' ' : '') + date;

      return {
        title: title || subtitle || '[Untitled]',
        subtitle: title ? subtitle : '',
        icon,
        action: 'itemActions',
        actionArgument: {
          zoteroSelectURL: itemData.zoteroSelectURL,
          itemID,
          itemKey: itemData.itemKey,
          creators: filteredCreators,
          date,
          title,
          icon,
        },
        actionReturnsItems: true,
        alwaysShowsSubtitle: true,
      };
    });
}

// ITEM ACTIONS

function itemActions(dict) {
  if (LaunchBar.options.commandKey) {
    selectInZotero(dict);
  } else if (LaunchBar.options.shiftKey) {
    pasteCitation(dict);
  } else {
    return showItemDetails(dict);
  }
}

function showItemDetails(dict) {
  const prefs = Action.preferences;
  const fields = prefs.fields;
  const creatorTypes = prefs.creatorTypes;
  const includeZoteroLink = prefs.includeZoteroLink ?? true;

  const itemID = dict.itemID;
  const data = loadData();

  const attachmentsWithPath = data.itemAttachments
    .filter((item) => itemID == item.parentItemID && item.path)
    .map((item) => {
      const fullPath = item.path.replace(
        'storage:',
        `${storageDirectory}${item.key}/`
      );
      const title = fullPath.split('/').pop();
      return {
        path: fullPath,
        title,
        type: item.contentType,
        key: item.key,
        itemID: item.itemID,
        parentItemID: item.parentItemID,
      };
    })
    .sort(naturalSort);

  const attachedUrlsItemIDs = data.itemAttachments
    .filter(
      (item) =>
        itemID == item.parentItemID &&
        !item.path &&
        (item.contentType == 'text/html' || item.contentType == null)
    )
    .map((item) => item.itemID);

  const attachedUrlsItems = [];
  let urls = [];

  let details = [
    {
      title: dict.title,
      icon: dict.icon,
      action: 'itemDetailActions',
      actionArgument: dict,
    },
  ];

  // Single pass over meta data
  const metaFields = {};
  for (const item of data.meta) {
    if (item.itemID === itemID) {
      if (item.fieldID === fields.url) {
        urls.push({
          title: item.value,
          url: item.value,
          icon: 'linkTemplate',
          action: 'openURL',
          actionArgument: { itemID, url: item.value },
        });
      } else {
        // Map other fields in one pass
        metaFields[item.fieldID] = item.value;
      }
    }

    if (
      attachedUrlsItemIDs.includes(item.itemID) &&
      (item.fieldID === fields.url || item.fieldID === fields.title)
    ) {
      attachedUrlsItems.push(item);
    }
  }

  // Use mapped fields
  const journalTitle = metaFields[fields.publicationTitle];
  const bookTitle = metaFields[fields.bookTitle];
  const seriesTitle = metaFields[fields.series];
  const dictionaryTitle = metaFields[fields.dictionaryTitle];
  const encyclopediaTitle = metaFields[fields.encyclopediaTitle];

  // Attached URLs
  const attachedUrls = [];
  const urlMap = new Map();

  for (const entry of attachedUrlsItems) {
    const id = entry.itemID;
    if (!urlMap.has(id)) {
      urlMap.set(id, { itemID: id });
    }
    const item = urlMap.get(id);

    if (entry.fieldID === fields.url) {
      item.url = entry.value;
    } else if (entry.fieldID === fields.title) {
      item.title = entry.value;
    }

    if (item.url && item.title) {
      attachedUrls.push(item);
      urlMap.delete(id); // Clean up map once we have both url and title
    }
  }

  // Add attached URLs to the existing urls array
  for (const item of attachedUrls) {
    urls.push({
      title: item.title,
      url: item.url,
      icon: 'linkTemplate',
      action: 'openURL',
      actionArgument: {
        itemID,
        url: item.url,
      },
    });
  }

  // Creator IDs
  const itemCreators = dict.creators || [];
  const authorIDs = [];
  const editorIDs = [];
  const otherIDs = [];

  for (const item of itemCreators) {
    if (item.creatorTypeID === creatorTypes.author) {
      authorIDs.push(item.creatorID);
    } else if (item.creatorTypeID === creatorTypes.editor) {
      editorIDs.push(item.creatorID);
    } else {
      otherIDs.push(item.creatorID);
    }
  }

  const creatorsArr =
    authorIDs.length > 0
      ? authorIDs
      : editorIDs.length > 0
      ? editorIDs
      : otherIDs;

  // Collections
  const collectionsArr = data.collectionItems
    .filter((item) => item.itemID === itemID)
    .map((item) => ({
      collectionName: item.collectionName,
      collectionID: item.collectionID,
    }));
  const collectionNames = collectionsArr.map((item) => item.collectionName);

  // Tags
  const relevantTags = data.itemTags.filter((item) => item.itemID === itemID);
  const tagNames = relevantTags.map((item) => item.name);
  const tagsArr = relevantTags.map((item) => ({
    name: item.name,
    tagID: item.tagID,
  }));

  // Notes
  const notes = data.itemNotes
    .filter((item) => itemID === item.parentItemID)
    .map((item) => ({
      title: item.title,
      icon: 'noteTemplate',
      action: 'openNote',
      actionArgument: {
        itemID: item.itemID,
        parentItemID: item.parentItemID,
      },
    }));

  dict.url = urls[0] ? urls[0].url : '';

  // MARK: DETAILS ARRAY CONSTRUCTION

  if (creatorsArr.length > 0) {
    const creatorsLength = itemCreators.length;
    const lastIndex = creatorsLength - 1;

    const creatorString =
      creatorsLength === 1
        ? itemCreators[0].name
        : creatorsLength === 2
        ? itemCreators.map((creator) => creator.name).join(' & ')
        : creatorsLength > 2
        ? `${itemCreators
            .slice(0, -1)
            .map((creator) => creator.lastName)
            .join(', ')} & ${itemCreators[lastIndex].lastName}`
        : '';

    details.push({
      title: creatorString,
      icon: 'creatorTemplate',
      action: 'showItemCreatorIDs',
      actionArgument: {
        creatorsArr,
      },
      actionReturnsItems: true,
    });
  }

  details.push({
    title: dict.date,
    icon: 'calTemplate',
  });

  // Publication metadata
  const publicationMetadata = [
    journalTitle && {
      title: journalTitle,
      icon: dict.icon + 'Template',
      action: 'showJournalArticles',
      actionArgument: journalTitle,
      actionReturnsItems: true,
    },
    bookTitle && {
      title: bookTitle,
      icon: 'bookTemplate',
      action: 'showBookSections',
      actionArgument: bookTitle,
      actionReturnsItems: true,
    },
    dictionaryTitle && {
      title: dictionaryTitle,
      icon: 'dictionaryTemplate',
      action: 'showDictionaryEntry',
      actionArgument: dictionaryTitle,
      actionReturnsItems: true,
    },
    encyclopediaTitle && {
      title: encyclopediaTitle,
      icon: 'encyclopediaTemplate',
      action: 'showEncyclopediaArticles',
      actionArgument: encyclopediaTitle,
      actionReturnsItems: true,
    },
    seriesTitle && {
      title: seriesTitle,
      icon: 'seriesTemplate',
      action: 'showSeriesItems',
      actionArgument: seriesTitle,
      actionReturnsItems: true,
    },
  ].filter(Boolean);

  details.push(...publicationMetadata);

  if (collectionNames.length > 0) {
    details.push({
      title: collectionNames.join(', '),
      icon: 'collectionTemplate',
      action: 'showItemCollections',
      actionArgument: {
        collectionsArr,
      },
      actionReturnsItems: true,
    });
  }

  // Tags
  if (tagNames.length > 0) {
    details.push({
      title: tagNames.join(', '),
      icon: 'tagTemplate',
      action: 'showItemTags',
      actionArgument: {
        tagsArr,
      },
      actionReturnsItems: true,
    });
  }

  // Annotations
  const annotations = data.annotations.filter(
    (ann) => ann.mainItemID === itemID
  );

  const annotationsItems =
    annotations.length === 0
      ? []
      : annotations.length === 1
      ? showAnnotations({
          itemID,
          annotations,
          attachments: attachmentsWithPath,
          dict,
        })
      : [
          {
            title: 'Annotations',
            badge: annotations.length.toString(),
            icon: 'annotationsTemplate',
            action: 'showAnnotations',
            actionArgument: {
              itemID,
              annotations,
              attachments: attachmentsWithPath,
              dict,
            },
            actionReturnsItems: true,
          },
        ];

  details.push(...notes, ...annotationsItems, ...urls);

  // Add Storage paths
  if (attachmentsWithPath.length > 0) {
    let found = false;
    for (const item of attachmentsWithPath) {
      if (
        !found &&
        (item.type === 'application/pdf' ||
          item.type === 'application/epub+zip' ||
          item.type === 'text/html')
      ) {
        details[0].subtitle = '';
        details[0].path = item.path;
        details[0].actionArgument.path = item.path;
        details[0].actionArgument.key = item.key;
        found = true;
      }
      const title = item.path.split('/').slice(-1)[0] || '';

      details.push({
        title: title,
        path: item.path,
        action: 'itemDetailActions',
        actionArgument: {
          path: item.path,
          key: item.key,
          itemID,
        },
        subtitle: '',
        icon: 'attachmentTemplate',
      });
    }
  }

  details.push(
    {
      title: includeZoteroLink ? 'Paste & Link Citation' : 'Paste Citation',
      icon: 'pasteCitationTemplate',
      action: 'pasteCitation',
      actionArgument: dict,
      actionRunsInBackground: true,
    },
    {
      title: includeZoteroLink
        ? 'Paste & Link Bibliography'
        : 'Paste Bibliography',
      icon: 'pasteBibTemplate',
      action: 'pasteCitation',
      actionArgument: { ...dict, isBibliography: true },
      actionRunsInBackground: true,
    },
    {
      title: 'Select in Zotero',
      icon: 'selectTemplate',
      url: dict.zoteroSelectURL,
      action: 'selectInZotero',
      actionArgument: dict,
    }
  );

  return details;
}

function itemDetailActions(dict) {
  // Options
  if (LaunchBar.options.commandKey) {
    if (dict.path && !dict.title) {
      // The title item also includes the path to the PDF file, but we want to open that in Zotero. For PDF items the title is automatically derived from the path…
      const parentDir = dict.path.split('/').slice(0, -1).join('/');
      saveRecent(dict.itemID);
      LaunchBar.hide();
      LaunchBar.openURL(File.fileURLForPath(parentDir));
      return;
    }

    return selectInZotero(dict);
  }

  if (LaunchBar.options.shiftKey) {
    return pasteCitation(dict);
  }

  // Save as Recent
  LaunchBar.hide();
  saveRecent(dict.itemID);

  // Open
  if (dict.key) {
    // dict.key is the attachment key
    const data = File.readJSON(dataPath);
    const foundItem = data.items.filter(
      (item) => dict.itemID === item.itemID
    )[0]; // the itemID is from the entry not the attachment … but should be the same library

    if (foundItem) {
      // does not work with epub files yet
      const zoteroFileHandlerPDFPref =
        zoteroPrefs['extensions.zotero.fileHandler.pdf'];

      if (zoteroFileHandlerPDFPref === 'system') {
        LaunchBar.openURL(File.fileURLForPath(dict.path));
        return;
      }

      if (zoteroFileHandlerPDFPref) {
        LaunchBar.openURL(
          File.fileURLForPath(dict.path),
          zoteroFileHandlerPDFPref.split('/').pop()
        );
        return;
      }

      const zoteroOpenPDFURL = `zotero://open-pdf/${foundItem.libraryID}_${dict.key}`;
      LaunchBar.openURL(zoteroOpenPDFURL);
    }
    return;
  }

  LaunchBar.openURL(dict.url || dict.zoteroSelectURL);
}

function showItemsByField(fieldID, value) {
  const data = loadData();

  const itemIDs = data.meta
    .filter(
      (item) =>
        item.fieldID === fieldID &&
        item.value.toLowerCase() === value.toLowerCase()
    )
    .map((item) => item.itemID);

  return showEntries(itemIDs);
}

function showBookSections(bookTitle) {
  return showItemsByField(Action.preferences.fields.bookTitle, bookTitle);
}

function showDictionaryEntry(dictionaryTitle) {
  return showItemsByField(
    Action.preferences.fields.dictionaryTitle,
    dictionaryTitle
  );
}

function showEncyclopediaArticles(encyclopediaTitle) {
  return showItemsByField(
    Action.preferences.fields.encyclopediaTitle,
    encyclopediaTitle
  );
}

function showSeriesItems(seriesTitle) {
  return showItemsByField(Action.preferences.fields.series, seriesTitle);
}

function showJournalArticles(journalTitle) {
  const data = loadData();

  const itemIDs = [
    ...new Set(
      data.meta
        .filter(
          (item) => item.value.toLowerCase() === journalTitle.toLowerCase()
        )
        .map((item) => item.itemID)
    ),
  ];

  return showEntries(itemIDs);
}

function showItemCreatorIDs({ creatorsArr }) {
  const data = loadData();

  if (creatorsArr.length == 1) {
    return showItemsWithCreator(creatorsArr[0]);
  }

  const results = creatorsArr.map((creatorID) => {
    let item = data.creators.find((creator) => creator.creatorID === creatorID);
    return {
      title: item.lastName + (item.firstName ? ', ' + item.firstName : ''),
      icon: 'creatorTemplate',
      action: 'showItemsWithCreator',
      actionArgument: item.creatorID.toString(),
      actionReturnsItems: true,
    };
  });

  return results;
}

function showItemCollections({ collectionsArr }) {
  if (collectionsArr.length == 1) {
    return showItemsWithCollection({
      collectionID: collectionsArr[0].collectionID,
    });
  }

  return collectionsArr.map((item) => ({
    title: item.collectionName,
    icon: 'collectionTemplate',
    action: 'showItemsWithCollection',
    actionArgument: {
      collectionID: item.collectionID,
    },
    actionReturnsItems: true,
  }));
}

function showItemTags({ tagsArr }) {
  if (tagsArr.length === 1) {
    return showItemsWithTag(tagsArr[0].tagID);
  }

  return tagsArr.map((item) => ({
    title: item.name,
    icon: 'tagTemplate',
    action: 'showItemsWithTag',
    actionArgument: item.tagID.toString(),
    actionReturnsItems: true,
  }));
}

function showAnnotations({ itemID, annotations, attachments, dict }) {
  const attOrder = new Map(attachments.map((a, i) => [a.itemID, i]));

  // Pre-parse sortIndex values to avoid repeated parsing
  const sortedAnnotations = annotations
    .map((ann) => ({
      ...ann,
      attachmentIDNum: parseInt(ann.attachmentID),
      attachmentOrder:
        attOrder.get(parseInt(ann.attachmentID)) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => {
      if (a.attachmentOrder !== b.attachmentOrder) {
        return a.attachmentOrder - b.attachmentOrder;
      }
      return a.sortIndex.localeCompare(b.sortIndex);
    });

  return sortedAnnotations
    .map((ann) => {
      const attachment = attachments.find(
        (att) => att.itemID === ann.attachmentIDNum
      );
      if (!attachment) return null;

      const title = ann.text || ann.comment || 'No text';
      const subtitle = ann.text && ann.comment ? ann.comment : '';
      let annotationURL = `zotero://open-pdf/library/items/${ann.attachmentKey}?annotation=${ann.annotationKey}`;

      if (ann.position) {
        try {
          const position = JSON.parse(ann.position);
          position.value &&
            (annotationURL += `&sel=${encodeURIComponent(position.value)}`);
        } catch (e) {} // Ignore JSON parse errors
      }

      const hasCommentAndText = ann.text && ann.comment;

      const icon = (() => {
        switch (ann.type) {
          case 1: // Highlight
            return ann.text
              ? hasCommentAndText
                ? 'annotationsTemplate'
                : 'highlightTemplate'
              : 'annotationTemplate';
          case 5: // Underline
            return 'underlinedTemplate';
          case 6: // Text
            return 'textTemplate';
          default:
            return 'annotationTemplate';
        }
      })();

      return {
        title,
        subtitle,
        alwaysShowsSubtitle: true,
        icon,
        action: 'annotationAction',
        actionArgument: {
          itemID,
          url: annotationURL,
          title,
          hasCommentAndText,
          text: ann.text,
          comment: ann.comment,
          pageLabel: ann.pageLabel,
          dict,
        },
        actionReturnsItems: hasCommentAndText ? true : false,
      };
    })
    .filter(Boolean); // Remove null entries
}

function annotationAction({
  itemID,
  url,
  title,
  hasCommentAndText,
  text,
  comment,
  pageLabel,
  dict,
}) {
  if (hasCommentAndText && !LaunchBar.options.commandKey) {
    return [
      {
        title: text,
        icon: 'highlightTemplate',
        action: 'annotationAction',
        actionArgument: {
          itemID,
          url,
          title,
          hasCommentAndText: false,
          text,
          comment,
          pageLabel,
          dict,
        },
      },
      {
        title: comment,
        icon: 'annotationTemplate',
        action: 'annotationAction',
        actionArgument: {
          itemID,
          url,
          title,
          hasCommentAndText: false,
          text,
          comment,
          pageLabel,
          dict,
        },
      },
    ];
  }

  LaunchBar.hide();

  if (LaunchBar.options.shiftKey) {
    const addCitationToAnnotation =
      Action.preferences.addCitationToAnnotation ?? true; // TODO: Add to preferences

    if (addCitationToAnnotation) {
      dict.annotation = title;
      dict.zoteroAnnotationURL = url;
      dict.pageLabel = pageLabel;
      pasteCitation(dict);
    } else {
      LaunchBar.paste(title);
    }
    return;
  }

  saveRecent(itemID);
  LaunchBar.openURL(url);
}

function openURL({ itemID, url }) {
  LaunchBar.hide();
  saveRecent(itemID);
  LaunchBar.openURL(url);
}

function selectInZotero({ itemID, zoteroSelectURL }) {
  LaunchBar.hide();
  saveRecent(itemID);
  LaunchBar.openURL(zoteroSelectURL);
}

function openNote({ parentItemID, itemID }) {
  // dict.itemID
  LaunchBar.hide();
  saveRecent(parentItemID);

  const data = File.readJSON(dataPath);

  const foundItem = data.items.filter((item) => itemID === item.itemID)[0];
  if (foundItem) {
    zoteroSelectURL = `zotero://select/items/${foundItem.libraryID}_${foundItem.key}`;
  }

  LaunchBar.openURL(zoteroSelectURL);
}

function saveRecent(itemID) {
  const recentItems = Action.preferences.recentItems || [];

  // Check if itemID exists in the recentItems array
  if (recentItems.indexOf(itemID) > -1) {
    // Move the item to the end of the array
    recentItems.splice(recentItems.indexOf(itemID), 1);
    recentItems.push(itemID);
  } else {
    // Add the item to the array
    recentItems.push(itemID);
  }

  if (recentItems.length > 3) {
    recentItems.splice(0, 1);
  }

  Action.preferences.recentItems = recentItems;
}
