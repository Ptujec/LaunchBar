/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const zoteroDirectory = getZoteroDirectory();

const storageDirectory = zoteroDirectory + 'storage/';

const dataPath = Action.supportPath + '/data.json';

const currentActionVersion = Action.version;
const lastUsedActionVersion = Action.preferences.lastUsedActionVersion ?? '0.1';

function run(argument) {
  // Show Settings
  if (LaunchBar.options.alternateKey) {
    return settings();
  }

  // Create JSON Data from SQL database. It will only do that if the database has been updated or if there is a new action version or if the JSON data has been removed (accidentally)

  let updateJSON;

  if (isNewerActionVersion(lastUsedActionVersion, currentActionVersion)) {
    updateJSON = true;
    Action.preferences.lastUsedActionVersion = Action.version;
  }

  if (!File.exists(dataPath)) {
    updateJSON = true;
  }

  const output = LaunchBar.execute(
    '/bin/sh',
    './data.sh',
    zoteroDirectory + 'zotero.sqlite',
    updateJSON
  );

  if (output) {
    File.writeText(output, dataPath);
  }

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
  if (argument != undefined) {
    return search(argument, data);
  }
  return browse(data);
}

// SEARCH
function search(argument, data) {
  argument = argument.toLowerCase();

  const getLowerCaseCreatorName = (item) =>
    `${item.firstName.toLowerCase()} ${item.lastName.toLowerCase()}`;

  const creatorIDs = data.creators.reduce((acc, item) => {
    if (getLowerCaseCreatorName(item).includes(argument))
      acc.set(item.creatorID, true);
    return acc;
  }, new Map());

  const itemCreatorsIDs = data.itemCreators
    .filter((item) => creatorIDs.has(item.creatorID))
    .map((item) => item.itemID);

  const itemTagsIDs = data.itemTags
    .filter((item) => item.name.toLowerCase().includes(argument))
    .map((item) => item.itemID);

  const collectionIDs = data.collectionItems
    .filter((item) => item.collectionName.toLowerCase().includes(argument))
    .map((item) => item.itemID);

  // Search all Fields (including title, place, publisher, isbn)
  const words = argument.split(' ');
  const wordMap = new Map(words.map((word) => [word, true]));
  const metaIDs = data.meta
    .filter((item) => {
      const value = item.value.toLowerCase();
      return [...wordMap.keys()].every((word) => value.includes(word));
    })
    .map((item) => item.itemID);

  const itemNotesIDs = data.itemNotes
    .filter((item) =>
      item.note
        .replace(/(<([^>]+)>)/g, '')
        .toLowerCase()
        .includes(argument)
    )
    .map((item) => item.parentItemID);

  const allReversedItemIDs = [
    ...itemCreatorsIDs.reverse(),
    ...itemTagsIDs.reverse(),
    ...collectionIDs.reverse(),
    ...metaIDs.reverse(),
    ...itemNotesIDs.reverse(),
  ];

  if (allReversedItemIDs.length === 0 || LaunchBar.options.commandKey) {
    allReversedItemIDs.push(...searchInStorageDir(argument, data));
  }

  return showEntries([...new Set(allReversedItemIDs)], data);
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
      // children: showCreators(),
      action: 'showCreators',
      // actionArgument: data,
    },
    {
      title: 'Tags',
      icon: 'tagTemplate',
      // children: showTags(data),
      action: 'showTags',
      // actionArgument: data,
    },
    {
      title: 'Collections',
      icon: 'collectionTemplate',
      // children: showCollections(data),
      action: 'showCollections',
      // actionArgument: data,
    },
    {
      title: 'All Items',
      icon: 'libraryTemplate',
      action: 'showAllItems',
      // actionArgument: data,
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
  // Get data from JSON
  const data = File.readJSON(dataPath);
  const fields = Action.preferences.fields;

  const itemIDs = data.meta
    .reduce(
      (acc, item) =>
        item.fieldID == fields.title ||
        item.fieldID == fields.caseName ||
        item.fieldID == fields.nameOfAct ||
        item.fieldID == fields.subject
          ? [...acc, item.itemID]
          : acc,
      []
    )
    .reverse();

  return showEntries(itemIDs, data);
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
      url: 'zotero://select/items/' + item.libraryID + '_' + item.key,
      // itemTypeID: item.itemTypeID,
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
          zoteroURL: itemsMap[itemID] ? itemsMap[itemID].url : '',
          itemID: itemID,
          creators: creators,
          date: date,
          title: title,
          icon: icon,
        },
        alwaysShowsSubtitle: true,
      });
    }
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
    openZoteroURL(dict);
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
  const paths = data.itemAttachments
    .filter((item) => itemID == item.parentItemID)
    .map((item) => {
      if (item.path) {
        return {
          path: item.path.replace(
            'storage:',
            storageDirectory + item.key + '/'
          ),
          type: item.contentType,
        };
      }
      if (
        !item.path &&
        (item.contentType == 'text/html' || item.contentType == null)
      ) {
        attachedUrlsItemIDs.push(item.itemID);
      }
      return null;
    })
    .filter((path) => path !== null);

  const attachedUrlsItems = [];
  let urls = [];

  for (const item of data.meta) {
    if (item.itemID == itemID) {
      if (item.fieldID == fields.url) {
        urls.push({
          urlTitle: item.value,
          url: item.value,
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
      url: item.url,
      urlTitle: item.title,
    })),
  ];

  // Creator IDs
  const creatorIDs = data.itemCreators.reduce(
    (acc, item) => {
      if (item.itemID === dict.itemID) {
        if (item.creatorTypeID === creatorTypes.author) {
          acc.authorIDs.push(item.creatorID);
        } else if (item.creatorTypeID === creatorTypes.editor) {
          acc.editorIDs.push(item.creatorID);
        } else {
          acc.otherIDs.push(item.creatorID);
        }
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
  const collectionsArr = data.collectionItems
    .filter((item) => item.itemID == itemID)
    .map((item) => ({
      collectionName: item.collectionName,
      collectionID: item.collectionID,
    }));

  const collections = collectionsArr.map((item) => item.collectionName);

  // Tags
  const tagsArr = data.itemTags
    .filter((item) => item.itemID == itemID)
    .map((item) => ({
      name: item.name,
      tagID: item.tagID,
    }));

  const tags = tagsArr.map((item) => item.name);

  // Notes
  const notes = data.itemNotes
    .filter((item) => itemID == item.parentItemID)
    .map((item) => {
      return {
        title: item.title,
        itemID: item.itemID,
        parentItemID: item.parentItemID,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  dict.url = urls[0] ? urls[0].url : '';

  details = [
    {
      title: dict.title,
      icon: dict.icon,
      action: 'itemDetailActions',
      actionArgument: dict,
    },
  ];

  if (creatorsArr.length > 0) {
    const creators = dict.creators;
    const creatorString =
      creators.length === 1
        ? creators[0].name
        : creators.length === 2
        ? creators.map((creator) => creator.name).join(' & ')
        : creators.length > 2
        ? `${creators
            .slice(0, -1)
            .map((creator) => creator.lastName)
            .join(', ')} & ${creators[creators.length - 1].lastName}`
        : '';

    details.push({
      title: creatorString,
      icon: 'creatorTemplate',
      action: 'showItemCreatorIDs',
      actionArgument: {
        creatorsArr: creatorsArr,
      },
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
    });
  }

  if (bookTitle) {
    details.push({
      title: bookTitle,
      icon: 'bookTemplate',
      action: 'showBookSections',
      actionArgument: bookTitle,
    });
  }

  if (dictionaryTitle) {
    details.push({
      title: dictionaryTitle,
      icon: 'dictionaryTemplate',
      action: 'showDictionaryEntry',
      actionArgument: dictionaryTitle,
    });
  }

  if (encyclopediaTitle) {
    details.push({
      title: encyclopediaTitle,
      icon: 'encyclopediaTemplate',
      action: 'showEncyclopediaArticles',
      actionArgument: encyclopediaTitle,
    });
  }

  if (seriesTitle) {
    details.push({
      title: seriesTitle,
      icon: 'seriesTemplate',
      action: 'showSeriesItems',
      actionArgument: seriesTitle,
    });
  }

  if (collections.length > 0) {
    details.push({
      title: collections.join(', '),
      icon: 'collectionTemplate',
      action: 'showItemCollections',
      actionArgument: {
        collectionsArr: collectionsArr,
      },
    });
  }

  // Tags
  if (tags.length > 0) {
    details.push({
      title: tags.join(', '),
      icon: 'tagTemplate',
      action: 'showItemTags',
      actionArgument: {
        tagsArr: tagsArr,
      },
    });
  }

  // Notes

  for (const item of notes) {
    details.push({
      title: item.title,
      icon: 'noteTemplate',
      action: 'openNote',
      actionArgument: {
        itemID: item.itemID,
        parentItemID: item.parentItemID,
      },
    });
  }

  for (const item of urls) {
    details.push({
      title: item.urlTitle,
      url: item.url,
      icon: 'linkTemplate',
      action: 'openURL',
      actionArgument: {
        itemID: itemID,
        url: item.url,
      },
    });
  }

  // Add Storage paths
  if (paths.length > 0) {
    for (let i = 0; i < paths.length; i++) {
      if (
        paths[i].type == 'application/pdf' ||
        paths[i].type == 'application/epub+zip'
      ) {
        details[0].subtitle = '';
        details[0].path = paths[i].path;
        details[0].actionArgument.path = paths[i].path;
        break;
      }
    }

    for (const item of paths) {
      const title = item.path.split('/').slice(-1)[0] || '';
      details.push({
        title: title,
        path: item.path,
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
      title: 'Open in Zotero',
      icon: 'openTemplate',
      url: dict.zoteroURL,
      action: 'openZoteroURL',
      actionArgument: dict,
    }
  );

  return details;
}

function itemDetailActions(dict) {
  // Options
  if (LaunchBar.options.commandKey) {
    return openZoteroURL(dict);
  }

  if (LaunchBar.options.shiftKey) {
    return pasteCitation(dict);
  }

  // Save as Recent
  LaunchBar.hide();
  saveRecent(dict.itemID);

  if (dict.path != undefined) {
    LaunchBar.openURL(File.fileURLForPath(dict.path));
  } else {
    LaunchBar.openURL(dict.url || dict.zoteroURL);
  }
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

function showItemCreatorIDs(dict) {
  let creatorsArr = dict.creatorsArr;

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
  }));
}

function pasteCitation(dict) {
  // TODO: Build citation according to a csl style sheet?

  saveRecent(dict.itemID);

  const prefs = Action.preferences;
  const creatorTypes = prefs.creatorTypes;
  const fields = prefs.fields;

  const data = File.readJSON(dataPath);

  const creatorNames = data.itemCreators.reduce(
    (acc, item) => {
      if (item.itemID === dict.itemID) {
        if (item.creatorTypeID === creatorTypes.author) {
          acc.authorNames.push(item.lastName);
        } else if (item.creatorTypeID === creatorTypes.editor) {
          acc.editorNames.push(item.lastName);
        } else {
          acc.otherNames.push(item.lastName);
        }
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
    for (let item of data.meta) {
      if (item.itemID === dict.itemID) {
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

  const citation =
    '(' +
    (creatorString || institution || title) +
    ' ' +
    (dict.date || 'n.d.') +
    ')';

  const citationFormat = Action.preferences.citationFormat;

  if (citationFormat == 'richText') {
    LaunchBar.executeAppleScriptFile(
      './rt.applescript',
      citation,
      dict.zoteroURL
    );
  } else if (citationFormat == 'markdown') {
    LaunchBar.paste('[' + citation + '](' + dict.zoteroURL + ')');
  } else {
    // LaunchBar.paste(citation);
    // LaunchBar.setClipboardString(dict.url);
    LaunchBar.executeAppleScript(
      'set the clipboard to "' + dict.zoteroURL + '"',
      'tell application "LaunchBar" to paste in frontmost application "' +
        citation +
        '"'
    );
  }
}

function openURL(dict) {
  LaunchBar.hide();
  saveRecent(dict.itemID);
  LaunchBar.openURL(dict.url);
}

function openZoteroURL(dict) {
  LaunchBar.hide();
  saveRecent(dict.itemID);

  if (checkZoteroVersion()) {
    LaunchBar.executeAppleScript(
      'tell application id "org.zotero.zotero" to launch'
    );
  }

  LaunchBar.openURL(dict.zoteroURL);
}

function openNote(dict) {
  // dict.itemID
  LaunchBar.hide();
  saveRecent(dict.parentItemID);

  const data = File.readJSON(dataPath);

  const foundItem = data.items.filter((item) => dict.itemID === item.itemID)[0];
  if (foundItem) {
    zoteroURL =
      'zotero://select/items/' + foundItem.libraryID + '_' + foundItem.key;
  }

  if (checkZoteroVersion()) {
    LaunchBar.executeAppleScript(
      'tell application id "org.zotero.zotero" to launch'
    );
  }

  LaunchBar.openURL(zoteroURL);
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

function checkZoteroVersion() {
  const contents = File.getDirectoryContents('/Applications/');

  const zotero = contents.find((item) => item.startsWith('Zotero')) || '';

  const plist = File.readPlist(`/Applications/${zotero}/Contents/Info.plist`);

  const version = parseInt(plist.CFBundleVersion.split('.')[0]);

  return version < 7;
}

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
  let formatIcon, badge;

  if (Action.preferences.citationFormat == 'richText') {
    formatIcon = 'rTemplate';
    badge = 'Rich Text';
  } else if (Action.preferences.citationFormat == 'markdown') {
    formatIcon = 'mTemplate';
    badge = 'Markdown';
  } else {
    formatIcon = 'pasteTemplate';
    badge = 'Plain';
  }

  return [
    {
      title: 'Citation Format',
      subtitle: badge,
      icon: formatIcon,
      children: listFormats(),
    },
  ];
}

function listFormats() {
  return [
    {
      title: 'Paste citation only',
      subtitle: 'The link will be copied to the clipboard',
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

function getZoteroDirectory() {
  const profilesDir = '~/Library/Application Support/Zotero/Profiles';
  const profile = File.getDirectoryContents(profilesDir)[0];
  const prefsPathContent = File.readText(`${profilesDir}/${profile}/prefs.js`);

  const match = prefsPathContent.match(
    /user_pref\("extensions.zotero.dataDir",\s*"([^"]*)"\);/
  );

  return match ? `${match[1]}/` : `${LaunchBar.homeDirectory}/Zotero/`;
}
