/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- Build citation according to a csl style sheet?
*/

const zoteroDirectory = getZoteroDirectory();

const storageDirectory = zoteroDirectory + 'storage/';

const dataPath = Action.supportPath + '/data.json';

const currentActionVersion = Action.version;
const lastUsedActionVersion = Action.preferences.lastUsedActionVersion ?? '0.1';

function run(argument) {
  // Show Settings
  if (LaunchBar.options.alternateKey) return settings();

  // Create JSON Data from SQL database. It will only do that if the database has been updated or if there is a new action version or if the JSON data has been removed (accidentally)

  let updateJSON;

  if (isNewerActionVersion(lastUsedActionVersion, currentActionVersion)) {
    updateJSON = true;
    Action.preferences.lastUsedActionVersion = Action.version;
  }

  if (!File.exists(dataPath)) updateJSON = true;

  const output = LaunchBar.execute(
    '/bin/sh',
    './data.sh',
    zoteroDirectory + 'zotero.sqlite',
    updateJSON
  );

  if (output) File.writeText(output, dataPath);

  // Get data from JSON
  const data = File.readJSON(dataPath);

  // Create itemType, field and creatorType variables
  if (updateJSON) {
    const itemTypes = data.itemTypes.reduce((acc, curr) => {
      acc[curr.typeName] = curr.itemTypeID;
      return acc;
    }, {});

    Action.preferences.itemTypes = itemTypes;

    const fields = data.fields.reduce((acc, curr) => {
      acc[curr.fieldName] = curr.fieldID;
      return acc;
    }, {});

    Action.preferences.fields = fields;

    const creatorTypes = data.creatorTypes.reduce((acc, curr) => {
      acc[curr.creatorType] = curr.creatorTypeID;
      return acc;
    }, {});

    Action.preferences.creatorTypes = creatorTypes;
  }

  // Search or browse sql database
  if (argument != undefined) return search(argument, data);

  // return browse(data);
  return browse(data);
}

// SEARCH

function search(argument, data) {
  argument = argument.toLowerCase();

  const getLowerCaseCreatorName = (item) =>
    `${item.firstName.toLowerCase()} ${item.lastName.toLowerCase()}`;

  const creatorIDs = data.creators.reduce((acc, item) => {
    if (getLowerCaseCreatorName(item).includes(argument))
      acc.add(item.creatorID);
    return acc;
  }, new Set());

  const itemCreatorsIDs = data.itemCreators.reduce(
    (acc, item) =>
      creatorIDs.has(item.creatorID) ? acc.add(item.itemID) : acc,
    new Set()
  );

  const itemTagsIDs = data.itemTags.reduce((acc, item) => {
    if (item.name.toLowerCase().includes(argument)) {
      acc.add(item.itemID);
    }
    return acc;
  }, new Set());

  const collectionIDs = data.collectionItems.reduce((acc, item) => {
    if (item.collectionName.toLowerCase().includes(argument)) {
      acc.add(item.itemID);
    }
    return acc;
  }, new Set());

  // Search all Fields (including title, place, publisher, isbn)
  const words = argument.split(' ');
  const wordMap = new Map(words.map((word) => [word, true]));

  const metaIDs = data.meta.reduce((acc, item) => {
    const value = item.value.toLowerCase();
    if ([...wordMap.keys()].every((word) => value.includes(word))) {
      acc.add(item.itemID);
    }
    return acc;
  }, new Set());

  const itemNotesIDs = data.itemNotes.reduce((ids, item) => {
    const note = item.note.replace(/(<([^>]+)>)/g, '').toLowerCase();
    if (note.includes(argument)) {
      ids.add(item.parentItemID);
    }
    return ids;
  }, new Set());

  const allReversedItemIDs = new Set([
    ...[...itemCreatorsIDs].reverse(),
    ...[...itemTagsIDs].reverse(),
    ...[...collectionIDs].reverse(),
    ...[...metaIDs].reverse(),
    ...[...itemNotesIDs].reverse(),
  ]);

  if (allReversedItemIDs.size === 0 || LaunchBar.options.commandKey) {
    allReversedItemIDs.add(...searchInStorageDir(argument, data));
  }

  // return showEntries(Array.from(allReversedItemIDs), data);
  return showEntries(allReversedItemIDs, data);
}

function searchInStorageDir(argument, data) {
  const output = LaunchBar.execute(
    '/usr/bin/mdfind',
    '-onlyin',
    storageDirectory,
    argument
  )
    .trim()
    .split('\n');

  const attachmentMap = new Map();
  for (const item of data.itemAttachments) {
    attachmentMap.set(item.key, [
      ...(attachmentMap.get(item.key) || []),
      item.parentItemID,
    ]);
  }

  const itemIDs = new Set(
    output.flatMap((path) => attachmentMap.get(path.split('/')[5]) || [])
  );

  return itemIDs;
}

// BROWSE
function browse(data) {
  const result =
    showEntries(Action.preferences.recentItems || [], data).reverse() || [];

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
  // Get data from JSON
  const data = File.readJSON(dataPath);

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

  const itemIDs = data.itemTags.reduce(
    (acc, item) => (item.tagID == tagID ? [...acc, item.itemID] : acc),
    []
  );

  return showEntries(itemIDs.reverse(), data);
}

function showCreators() {
  const data = File.readJSON(dataPath);

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
  const data = File.readJSON(dataPath);

  const itemIDs = data.itemCreators.reduce((acc, item) => {
    if (item.creatorID === creatorID) {
      if (!acc.includes(item.itemID)) {
        acc.push(item.itemID);
      }
    }
    return acc;
  }, []);

  return showEntries(itemIDs.reverse(), data);
}

function showCollections() {
  const data = File.readJSON(dataPath);

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
  const data = File.readJSON(dataPath);

  const itemIDs = data.collectionItems
    .reduce(
      (acc, item) =>
        item.collectionID == collectionID ? [...acc, item.itemID] : acc,
      []
    )
    .reverse();

  return showEntries(itemIDs, data);
}

function showAllItems() {
  const data = File.readJSON(dataPath);
  const fields = Action.preferences.fields;

  const itemIDs = data.meta.reduce((acc, item) => {
    if (
      item.fieldID == fields.title ||
      item.fieldID == fields.caseName ||
      item.fieldID == fields.nameOfAct ||
      item.fieldID == fields.subject
    ) {
      acc.add(item.itemID);
    }
    return acc;
  }, new Set());

  return showEntries([...itemIDs].reverse(), data);
}

function showEntries(itemIDs, data) {
  const prefs = Action.preferences;
  const itemTypes = prefs.itemTypes;
  const fields = prefs.fields;
  const creatorTypes = prefs.creatorTypes;

  let attachmentItemIDs = {};
  const itemsMap = data.items.reduce((map, item) => {
    if (
      item.itemTypeID == itemTypes.attachment ||
      item.itemTypeID == itemTypes.note ||
      item.itemTypeID == itemTypes.annotation
    ) {
      attachmentItemIDs[item.itemID] = true;
    }
    map[item.itemID] = {
      zoteroSelectURL: `zotero://select/items/${item.libraryID}_${item.key}`,
      typeName: item.typeName,
    };
    return map;
  }, {});

  const itemCreatorsMap = data.itemCreators.reduce((map, itemCreator) => {
    map[itemCreator.itemID] = map[itemCreator.itemID] || [];
    map[itemCreator.itemID].push({
      name: [itemCreator.lastName, initializeName(itemCreator.firstName)]
        .filter(Boolean)
        .join(', '),
      lastName: itemCreator.lastName,
      typeID: itemCreator.creatorTypeID,
      creatorID: itemCreator.creatorID,
    });
    return map;
  }, {});

  const metaMap = data.meta.reduce(
    (map, meta) => {
      if (
        meta.fieldID == fields.title ||
        meta.fieldID == fields.caseName ||
        meta.fieldID == fields.nameOfAct ||
        meta.fieldID == fields.subject
      ) {
        map.title[meta.itemID] = meta.value;
      }

      if (meta.fieldID == fields.date) {
        map.date[meta.itemID] = meta.value;
      }

      return map;
    },
    { title: {}, date: {} }
  );

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
    'annotation',
    'attachment',
  ]);

  let result = [];

  for (const itemID of itemIDs) {
    if (itemID in itemsMap && !attachmentItemIDs[itemID]) {
      const iconBase = itemsMap[itemID]?.typeName || 'document';
      const icon = templateIcons.has(iconBase)
        ? iconBase + 'Template'
        : iconBase;

      const creators = itemCreatorsMap[itemID]
        ? (() => {
            const type1Exists = itemCreatorsMap[itemID].some(
              (c) => c.typeID === creatorTypes.author
            );
            const type3Exists = itemCreatorsMap[itemID].some(
              (c) => c.typeID === creatorTypes.editor
            );

            return itemCreatorsMap[itemID].reduce((acc, creator) => {
              type1Exists
                ? creator.typeID === creatorTypes.author && acc.push(creator)
                : type3Exists
                ? creator.typeID === creatorTypes.editor && acc.push(creator)
                : acc.push(creator);

              return acc;
            }, []);
          })()
        : '';

      const creatorString =
        creators.length > 3
          ? `${creators[0].lastName} et al.`
          : creators.length === 3
          ? `${creators[0].lastName}, ${creators[1].lastName} & ${creators[2].lastName}`
          : creators.length === 2
          ? creators.map((creator) => creator.lastName).join(' & ')
          : creators.length === 1
          ? creators[0].name
          : '';

      const date = metaMap.date[itemID]
        ? metaMap.date[itemID].split('-')[0]
        : '';

      const title = metaMap.title[itemID];
      const subtitle = (creatorString ? creatorString + ' ' : '') + date;

      result.push({
        title: title || subtitle || '[Untitled]',
        subtitle: title ? subtitle : '',
        icon: icon,
        action: 'itemActions',
        actionArgument: {
          zoteroSelectURL: itemsMap[itemID]
            ? itemsMap[itemID].zoteroSelectURL
            : '',
          itemID: itemID,
          creators: creators,
          date: date,
          title: title,
          icon: icon,
        },
        actionReturnsItems: true,
        alwaysShowsSubtitle: true,
      });
    }
  }

  if (result.length === 0) {
    return [
      {
        title: 'No results. Press enter to browse all items.',
        icon: 'greyTemplate',
        action: 'browse',
        actionArgument: data,
        actionReturnsItems: true,
      },
    ];
  }

  return result;
}

function initializeName(name) {
  return name
    .split(' ')
    .map((part, index) => (index === 0 ? part : part.charAt(0) + '.'))
    .join(' ');
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

  const itemID = dict.itemID;
  const data = File.readJSON(dataPath);

  let journalTitle, bookTitle, seriesTitle, dictionaryTitle, encyclopediaTitle;

  const attachedUrlsItemIDs = [];

  const attachmentsWithPath = data.itemAttachments.reduce((acc, item) => {
    if (itemID == item.parentItemID) {
      if (item.path) {
        acc.push({
          path: item.path.replace(
            'storage:',
            storageDirectory + item.key + '/'
          ),
          type: item.contentType,
          key: item.key,
        });
      } else if (
        !item.path &&
        (item.contentType == 'text/html' || item.contentType == null)
      ) {
        attachedUrlsItemIDs.push(item.itemID);
      }
    }
    return acc;
  }, []);

  const attachedUrlsItems = [];
  let urls = [];

  for (const item of data.meta) {
    if (item.itemID == itemID) {
      if (item.fieldID == fields.url) {
        urls.push({
          title: item.value,
          url: item.value,
          icon: 'linkTemplate',
          action: 'openURL',
          actionArgument: {
            itemID,
            url: item.value,
          },
        });
      }
      if (item.fieldID == fields.series) {
        seriesTitle = item.value;
      }
      if (item.fieldID == fields.publicationTitle) {
        journalTitle = item.value;
      }
      if (item.fieldID == fields.bookTitle) {
        bookTitle = item.value;
      }
      if (item.fieldID == fields.dictionaryTitle) {
        dictionaryTitle = item.value;
      }
      if (item.fieldID == fields.encyclopediaTitle) {
        encyclopediaTitle = item.value;
      }
    }

    if (
      attachedUrlsItemIDs.includes(item.itemID) &&
      (item.fieldID == fields.url || item.fieldID == fields.title)
    ) {
      attachedUrlsItems.push(item);
    }
  }

  const attachedUrls = attachedUrlsItems.reduce((acc, entry) => {
    let existingItem = acc.find((item) => item.itemID === entry.itemID);

    if (!existingItem) {
      existingItem = { itemID: entry.itemID };
      acc.push(existingItem);
    }

    if (entry.fieldID === fields.url) {
      existingItem.url = entry.value;
    } else if (entry.fieldID === fields.title) {
      existingItem.title = entry.value;
    }

    return acc;
  }, []);

  urls = [
    ...urls,
    ...attachedUrls.map((item) => ({
      title: item.title,
      url: item.url,
      icon: 'linkTemplate',
      action: 'openURL',
      actionArgument: {
        itemID,
        url: item.url,
      },
    })),
  ];

  // Creator IDs
  const itemCreators = dict.creators || [];
  const creatorIDs = itemCreators.reduce(
    (acc, item) => {
      if (item.creatorTypeID === creatorTypes.author) {
        acc.authorIDs.push(item.creatorID);
      } else if (item.creatorTypeID === creatorTypes.editor) {
        acc.editorIDs.push(item.creatorID);
      } else {
        acc.otherIDs.push(item.creatorID);
      }

      return acc;
    },
    {
      authorIDs: [],
      editorIDs: [],
      otherIDs: [],
    }
  );

  const creatorsArr =
    creatorIDs.authorIDs.length > 0
      ? creatorIDs.authorIDs
      : creatorIDs.editorIDs.length > 0
      ? creatorIDs.editorIDs
      : creatorIDs.otherIDs;

  // Collections
  const collections = data.collectionItems.reduce(
    (acc, item) => {
      if (item.itemID === itemID) {
        acc.collectionNames.push(item.collectionName);
        acc.collectionsArr.push({
          collectionName: item.collectionName,
          collectionID: item.collectionID,
        });
      }
      return acc;
    },
    { collectionNames: [], collectionsArr: [] }
  );
  const collectionNames = collections.collectionNames;
  const collectionsArr = collections.collectionsArr;

  // Tags
  const tags = data.itemTags.reduce(
    (acc, item) => {
      if (item.itemID === itemID) {
        acc.tagNames.push(item.name);
        acc.tagsArr.push({
          name: item.name,
          tagID: item.tagID,
        });
      }
      return acc;
    },
    { tagNames: [], tagsArr: [] }
  );
  const tagNames = tags.tagNames;
  const tagsArr = tags.tagsArr;

  // Notes
  const notes = data.itemNotes.reduce((acc, item) => {
    if (itemID == item.parentItemID) {
      acc.push({
        title: item.title,
        icon: 'noteTemplate',
        action: 'openNote',
        actionArgument: {
          itemID: item.itemID,
          parentItemID: item.parentItemID,
        },
      });
    }
    return acc;
  }, []);

  dict.url = urls[0] ? urls[0].url : '';

  // Details Array Construction

  details = [
    {
      title: dict.title,
      icon: dict.icon,
      action: 'itemDetailActions',
      actionArgument: dict,
    },
  ];

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

  if (journalTitle) {
    details.push({
      title: journalTitle,
      icon: dict.icon + 'Template',
      action: 'showJournalArticles',
      actionArgument: journalTitle,
      actionReturnsItems: true,
    });
  }

  if (bookTitle) {
    details.push({
      title: bookTitle,
      icon: 'bookTemplate',
      action: 'showBookSections',
      actionArgument: bookTitle,
      actionReturnsItems: true,
    });
  }

  if (dictionaryTitle) {
    details.push({
      title: dictionaryTitle,
      icon: 'dictionaryTemplate',
      action: 'showDictionaryEntry',
      actionArgument: dictionaryTitle,
      actionReturnsItems: true,
    });
  }

  if (encyclopediaTitle) {
    details.push({
      title: encyclopediaTitle,
      icon: 'encyclopediaTemplate',
      action: 'showEncyclopediaArticles',
      actionArgument: encyclopediaTitle,
      actionReturnsItems: true,
    });
  }

  if (seriesTitle) {
    details.push({
      title: seriesTitle,
      icon: 'seriesTemplate',
      action: 'showSeriesItems',
      actionArgument: seriesTitle,
      actionReturnsItems: true,
    });
  }

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

  // Notes & URLs
  details = [...details, ...notes, ...urls];

  // Add Storage paths
  if (attachmentsWithPath.length > 0) {
    let found = false;
    for (const item of attachmentsWithPath) {
      if (
        !found &&
        (item.type === 'application/pdf' ||
          item.type === 'application/epub+zip')
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
      title: 'Cite and Link',
      icon: 'citeTemplate',
      action: 'pasteCitation',
      actionArgument: dict,
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
  if (Action.preferences.openOption == 'systemDefault' && dict.path) {
    LaunchBar.openURL(File.fileURLForPath(dict.path));
    return;
  }

  if (dict.key) {
    // dict.key is the attachment key
    const data = File.readJSON(dataPath);
    const foundItem = data.items.filter(
      (item) => dict.itemID === item.itemID
    )[0]; // the itemID is from the entry not the attachment … but should be the same library
    if (foundItem) {
      // does not work with epub files
      zoteroOpenPDFURL = `zotero://open-pdf/${foundItem.libraryID}_${dict.key}`;
      LaunchBar.openURL(zoteroOpenPDFURL);
    }
    return;
  }

  LaunchBar.openURL(dict.url || dict.zoteroSelectURL);
}

function showItemsByField(fieldID, value) {
  const data = File.readJSON(dataPath);

  const itemIDs = data.meta
    .filter(
      (item) =>
        item.fieldID === fieldID &&
        item.value.toLowerCase() === value.toLowerCase()
    )
    .map((item) => item.itemID);

  return showEntries(itemIDs, data);
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
  const data = File.readJSON(dataPath);

  const itemIDs = data.meta.reduce((acc, item) => {
    if (item.value.toLowerCase() === journalTitle.toLowerCase()) {
      acc.add(item.itemID);
    }
    return acc;
  }, new Set());

  return showEntries(Array.from(itemIDs), data);
}

function showItemCreatorIDs({ creatorsArr }) {
  // Get data from JSON
  let data = File.readJSON(dataPath);

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

function pasteCitation(dict) {
  // TODO: Build citation according to a csl style sheet?
  const itemID = dict.itemID;
  const itemCreators = dict.creators || [];

  saveRecent(itemID);

  const prefs = Action.preferences;
  const creatorTypes = prefs.creatorTypes;
  const fields = prefs.fields;

  const creatorNames = itemCreators.reduce(
    (acc, item) => {
      if (item.creatorTypeID === creatorTypes.author) {
        acc.authorNames.push(item.lastName);
      } else if (item.creatorTypeID === creatorTypes.editor) {
        acc.editorNames.push(item.lastName);
      } else {
        acc.otherNames.push(item.lastName);
      }
      return acc;
    },
    {
      authorNames: [],
      editorNames: [],
      otherNames: [],
    }
  );

  const creators =
    creatorNames.authorNames.length > 0
      ? creatorNames.authorNames
      : creatorNames.editorNames.length > 0
      ? creatorNames.editorNames
      : creatorNames.otherNames;

  // creators.sort();

  const creatorString =
    creators.length > 3
      ? `${creators[0]} et al.`
      : creators.length === 3
      ? `${creators[0]}, ${creators[1]} & ${creators[2]}`
      : creators.length > 0
      ? creators.join(' & ')
      : '';

  let institution, title;

  if (!creatorString) {
    const data = File.readJSON(dataPath);
    for (let item of data.meta) {
      if (item.itemID === itemID) {
        if (item.fieldID === fields.institution) {
          institution = item.value;
          break;
        } else if (
          item.fieldID === fields.title ||
          item.fieldID === fields.caseName ||
          item.fieldID === fields.nameOfAct ||
          item.fieldID === fields.subject
        ) {
          title = item.value;
          break;
        }
      }
    }
  }

  const citation = `(${creatorString || institution || title} ${
    dict.date || 'n.d.'
  })`;

  const citationFormat = Action.preferences.citationFormat;

  if (citationFormat == 'richText') {
    LaunchBar.executeAppleScriptFile(
      './rt.applescript',
      citation,
      dict.zoteroSelectURL
    );
  } else if (citationFormat == 'markdown') {
    LaunchBar.paste(`[${citation}](${dict.zoteroSelectURL})`);
  } else {
    // LaunchBar.paste(citation);
    // LaunchBar.setClipboardString(dict.url);
    LaunchBar.executeAppleScript(
      `set the clipboard to "${dict.zoteroSelectURL}"`,
      `tell application "LaunchBar" to paste in frontmost application "${citation}"`
    );
  }
}

function openURL({ itemID, url }) {
  LaunchBar.hide();
  saveRecent(itemID);
  LaunchBar.openURL(url);
}

function selectInZotero({ itemID, zoteroSelectURL }) {
  LaunchBar.hide();
  saveRecent(itemID);

  // if (checkZoteroVersion()) {
  //   LaunchBar.executeAppleScript(
  //     'tell application id "org.zotero.zotero" to launch'
  //   );
  // }

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

  // if (checkZoteroVersion()) {
  //   LaunchBar.executeAppleScript(
  //     'tell application id "org.zotero.zotero" to launch'
  //   );
  // }

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

// function checkZoteroVersion() {
//   const contents = File.getDirectoryContents('/Applications/');

//   const zotero = contents.find((item) => item.startsWith('Zotero')) || '';

//   const plist = File.readPlist(`/Applications/${zotero}/Contents/Info.plist`);

//   const version = parseInt(plist.CFBundleVersion.split('.')[0]);

//   return version < 7;
// }

function isNewerActionVersion(lastUsedActionVersion, currentActionVersion) {
  const lastUsedParts = lastUsedActionVersion.split('.');
  const currentParts = currentActionVersion.split('.');
  for (let i = 0; i < currentParts.length; i++) {
    const a = ~~currentParts[i]; // parse int
    const b = ~~lastUsedParts[i]; // parse int
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

// SETTINGS

function settings() {
  let formatIcon, formatSelection;

  if (Action.preferences.citationFormat == 'richText') {
    formatIcon = 'rTemplate';
    formatSelection = 'Rich Text';
  } else if (Action.preferences.citationFormat == 'markdown') {
    formatIcon = 'mTemplate';
    formatSelection = 'Markdown';
  } else {
    formatIcon = 'pasteTemplate';
    formatSelection = 'Plain';
  }

  return [
    {
      title: 'Citation Format',
      subtitle: formatSelection,
      alwaysShowsSubtitle: true,
      icon: formatIcon,
      children: listFormats(),
    },
    {
      title: 'Open Attachments',
      alwaysShowsSubtitle: true,
      subtitle:
        Action.preferences.openOption == 'systemDefault'
          ? 'System Default'
          : 'Respect Zotero Setting',
      icon:
        Action.preferences.openOption == 'systemDefault'
          ? 'systemDefaultTemplate'
          : 'zoteroSettingTemplate',
      children: listOpenOptions(),
    },
  ];
}

function listFormats() {
  return [
    {
      title: 'Paste citation only',
      subtitle: 'The link will be copied to the clipboard',
      alwaysShowsSubtitle: true,
      // icon: 'plainTemplate',
      icon: 'pasteTemplate',
      action: 'setFormat',
      actionArgument: 'plain',
    },
    {
      title: 'Paste citation with link as rich text',
      icon: 'rTemplate',
      action: 'setFormat',
      actionArgument: 'richText',
    },
    {
      title: 'Paste citation with link as markdown',
      icon: 'mTemplate',
      action: 'setFormat',
      actionArgument: 'markdown',
    },
  ];
}

function setFormat(citationFormat) {
  Action.preferences.citationFormat = citationFormat;
  return settings();
}

function listOpenOptions() {
  return [
    {
      title: 'Respect Zotero Setting',
      subtitle: 'Will respect the reader setting in Zotero (Gerneral/Reader).',
      alwaysShowsSubtitle: true,
      icon: 'zoteroSettingTemplate',
      action: 'setOpenOption',
      actionArgument: 'zoteroSetting',
    },
    {
      title: 'System Default',
      subtitle: 'Will use the default app without opening Zotero first.',
      alwaysShowsSubtitle: true,
      icon: 'systemDefaultTemplate',
      action: 'setOpenOption',
      actionArgument: 'systemDefault',
    },
  ];
}

function setOpenOption(openOption) {
  Action.preferences.openOption = openOption;
  return settings();
}

function getZoteroDirectory() {
  const profilesDir = '~/Library/Application Support/Zotero/Profiles';
  const profile = File.getDirectoryContents(profilesDir)[0];
  const prefsPathContent = File.readText(`${profilesDir}/${profile}/prefs.js`);

  const match = prefsPathContent.match(
    /user_pref\("extensions.zotero.dataDir",\s*"([^"]*)"\);/
  );

  return match ? `${match[1]}/` : `${LaunchBar.homeDirectory}/Zotero/`;
}
