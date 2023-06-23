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

  if (isNewerActionVersion(lastUsedActionVersion, currentActionVersion)) {
    var updateJSON = true;

    Action.preferences.lastUsedActionVersion = Action.version;
  }

  if (!File.exists(dataPath)) {
    var updateJSON = true;
  }

  var data = LaunchBar.execute(
    '/bin/sh',
    './data.sh',
    zoteroDirectory + 'zotero.sqlite',
    updateJSON
  );

  if (data) {
    File.writeText(data, dataPath);
  }

  // Get data from JSON
  var data = File.readJSON(dataPath);

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
  var output = LaunchBar.execute(
    '/usr/bin/mdfind',
    '-onlyin',
    storageDirectory,
    argument
  )
    .trim()
    .split('\n');

  var itemIDs = output.reduce((acc, path) => {
    const attachmentKey = path.split('/')[5];

    data.itemAttachments.forEach((item) => {
      if (item.key === attachmentKey) {
        acc.add(item.parentItemID);
      }
    });

    return acc;
  }, new Set());

  return itemIDs;
}

// BROWSE
function browse(data) {
  var result =
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
  var data = File.readJSON(dataPath);

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
  var tagID = parseInt(tagIDString);
  var data = File.readJSON(dataPath);

  var itemIDs = [];
  data.itemTags.forEach(function (item) {
    if (item.tagID == tagID) {
      itemIDs.push(item.itemID);
    }
  });

  return showEntries(itemIDs.reverse(), data);
}

function showCreators() {
  // Get data from JSON
  var data = File.readJSON(dataPath);

  data.itemCreators.sort((a, b) =>
    a.lastName + ', ' + a.firstName > b.lastName + ', ' + b.firstName ? 1 : -1
  );

  const results = data.itemCreators.reduce(
    (acc, item) => {
      const title =
        item.lastName + (item.firstName ? ', ' + item.firstName : '');
      if (!acc.map.has(title)) {
        acc.map.set(title, true);
        acc.result.push({
          title: title,
          icon: 'creatorTemplate',
          action: 'showItemsWithCreator',
          actionArgument: item.creatorID.toString(),
        });
      }
      return acc;
    },
    { map: new Map(), result: [] }
  ).result;

  return results;
}

function showItemsWithCreator(creatorIDString) {
  var creatorID = parseInt(creatorIDString);
  var data = File.readJSON(dataPath);

  var itemIDs = [];
  data.itemCreators.forEach(function (item) {
    if (item.creatorID == creatorID) {
      itemIDs.push(item.itemID);
    }
  });

  // Filter duplicates
  itemIDs = [...new Set(itemIDs)];

  return showEntries(itemIDs.reverse(), data);
}

function showCollections() {
  // Get data from JSON
  var data = File.readJSON(dataPath);

  const collections = data.collections.map((item) => {
    return {
      title: item.collectionName,
      icon: 'collectionTemplate',
      action: 'showItemsWithCollection',
      actionArgument: item.collectionID.toString(),
      // children: showItemsWithCollection(item.collectionID.toString()),
    };
  });

  return collections.sort((a, b) => a.title.localeCompare(b.title));
}

function showItemsWithCollection(collectionIDString) {
  var collectionID = parseInt(collectionIDString);
  var data = File.readJSON(dataPath);

  var itemIDs = [];
  data.collectionItems.forEach(function (item) {
    if (item.collectionID == collectionID) {
      itemIDs.push(item.itemID);
    }
  });

  return showEntries(itemIDs.reverse(), data);
}

function showAllItems() {
  // Get data from JSON
  const data = File.readJSON(dataPath);
  const fields = Action.preferences.fields;

  var itemIDs = data.meta.reduce((acc, item) => {
    return item.fieldID == fields.title ||
      item.fieldID == fields.caseName ||
      item.fieldID == fields.nameOfAct ||
      item.fieldID == fields.subject
      ? [...acc, item.itemID]
      : acc;
  }, []);

  return showEntries(itemIDs.reverse(), data);
}

function showEntries(itemIDs, data) {
  const prefs = Action.preferences;
  const itemTypes = prefs.itemTypes;
  const fields = prefs.fields;
  const creatorTypes = prefs.creatorTypes;

  var attachmentItemIDs = {};
  var itemsMap = data.items.reduce((map, item) => {
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

  var itemCreatorsMap = data.itemCreators.reduce((map, itemCreator) => {
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

  var itemTitleMap = data.meta.reduce((map, meta) => {
    if (
      meta.fieldID == fields.title ||
      meta.fieldID == fields.caseName ||
      meta.fieldID == fields.nameOfAct ||
      meta.fieldID == fields.subject
    ) {
      map[meta.itemID] = meta.value;
    }
    return map;
  }, {});

  var itemDateMap = data.meta.reduce((map, meta) => {
    if (meta.fieldID == fields.date) {
      map[meta.itemID] = meta.value;
    }
    return map;
  }, {});

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

  var result = [];
  itemIDs.forEach((itemID) => {
    if (itemID in itemsMap && !attachmentItemIDs[itemID]) {
      const iconBase = itemsMap[itemID]
        ? itemsMap[itemID].typeName
        : 'document';
      const icon = templateIcons.has(iconBase)
        ? iconBase + 'Template'
        : iconBase;

      const creators = itemCreatorsMap[itemID]
        ? itemCreatorsMap[itemID]
            .filter((creators) => {
              const type1Exists = itemCreatorsMap[itemID].some(
                (c) => c.typeID === creatorTypes.author
              );
              if (type1Exists) {
                return creators.typeID === creatorTypes.author;
              }
              const type3Exists = itemCreatorsMap[itemID].some(
                (c) => c.typeID === creatorTypes.editor
              );
              if (type3Exists) {
                return creators.typeID === creatorTypes.editor;
              }
              return true;
            })
            .map((creators) => creators)
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

      const date = itemDateMap[itemID] ? itemDateMap[itemID].split('-')[0] : '';

      const title = itemTitleMap[itemID];
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
  });

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

  let journalTitle, bookTitle, seriesTitle;

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

  data.meta.forEach((item) => {
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
    }

    if (
      attachedUrlsItemIDs.includes(item.itemID) &&
      (item.fieldID == fields.url || item.fieldID == fields.title)
    ) {
      attachedUrlsItems.push(item);
    }
  });

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
  const authorIDs = data.itemCreators
    .filter(
      (item) =>
        item.itemID === dict.itemID &&
        item.creatorTypeID === creatorTypes.author
    ) // 1
    .map((item) => item.creatorID);
  const editorIDs = data.itemCreators
    .filter(
      (item) =>
        item.itemID === dict.itemID &&
        item.creatorTypeID === creatorTypes.editor
    )
    .map((item) => item.creatorID);
  const otherIDs = data.itemCreators
    .filter(
      (item) =>
        item.itemID === dict.itemID &&
        item.creatorTypeID !== creatorTypes.author &&
        item.creatorTypeID !== creatorTypes.editor
    )
    .map((item) => item.creatorID);

  const creatorsArr =
    authorIDs.length > 0
      ? authorIDs
      : editorIDs.length > 0
      ? editorIDs
      : otherIDs;

  // Collections
  var collectionsArr = data.collectionItems
    .filter((item) => item.itemID == itemID)
    .map((item) => ({
      collectionName: item.collectionName,
      collectionID: item.collectionID,
    }));

  var collections = collectionsArr.map((item) => item.collectionName);

  // Tags
  var tagsArr = data.itemTags
    .filter((item) => item.itemID == itemID)
    .map((item) => ({
      name: item.name,
      tagID: item.tagID,
    }));

  var tags = tagsArr.map((item) => item.name);

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
  notes.forEach(function (item) {
    details.push({
      title: item.title,
      icon: 'noteTemplate',
      action: 'openNote',
      actionArgument: {
        itemID: item.itemID,
        parentItemID: item.parentItemID,
      },
    });
  });

  urls.forEach(function (item) {
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
  });

  // Add Storage paths
  if (paths.length > 0) {
    for (var i = 0; i < paths.length; i++) {
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

    paths.forEach(function (item) {
      var title = item.path.split('/').slice(-1)[0] || '';
      details.push({
        title: title,
        path: item.path,
        subtitle: '',
        icon: 'attachmentTemplate',
      });
    });
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

function showBookSections(bookTitle) {
  const data = File.readJSON(dataPath);
  var itemIDs = [];

  data.meta.forEach(function (item) {
    if (
      item.fieldID == Action.preferences.fields.bookTitle &&
      item.value.toLowerCase() == bookTitle.toLowerCase()
    ) {
      itemIDs.push(item.itemID);
    }
  });
  return showEntries(itemIDs, data);
}

function showSeriesItems(seriesTitle) {
  const data = File.readJSON(dataPath);
  var itemIDs = [];

  data.meta.forEach(function (item) {
    if (
      item.fieldID == Action.preferences.fields.series &&
      item.value.toLowerCase() == seriesTitle.toLowerCase()
    ) {
      itemIDs.push(item.itemID);
    }
  });
  return showEntries(itemIDs, data);
}

function showJournalArticles(journalTitle) {
  const data = File.readJSON(dataPath);
  var itemIDs = [];

  data.meta.forEach(function (item) {
    if (item.value.toLowerCase() == journalTitle.toLowerCase()) {
      itemIDs.push(item.itemID);
    }
  });

  // Filter duplicates
  itemIDs = [...new Set(itemIDs)];

  return showEntries(itemIDs, data);
}

function showItemCreatorIDs(dict) {
  let creatorsArr = dict.creatorsArr;

  // Get data from JSON
  let data = File.readJSON(dataPath);

  if (creatorsArr.length == 1) {
    return showItemsWithCreator(creatorsArr[0]);
  }

  var results = creatorsArr.map((creatorID) => {
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

function showItemCollections(dict) {
  let collectionsArr = dict.collectionsArr;

  if (collectionsArr.length == 1) {
    return showItemsWithCollection(collectionsArr[0].collectionID);
  }

  var results = [];
  collectionsArr.forEach(function (item) {
    results.push({
      title: item.collectionName,
      icon: 'collectionTemplate',
      action: 'showItemsWithCollection',
      actionArgument: item.collectionID.toString(),
    });
  });
  return results;
}

function showItemTags(dict) {
  let tagsArr = dict.tagsArr;
  if (tagsArr.length == 1) {
    return showItemsWithTag(tagsArr[0].tagID);
  }

  var results = [];
  tagsArr.forEach(function (item) {
    results.push({
      title: item.name,
      icon: 'tagTemplate',
      action: 'showItemsWithTag',
      actionArgument: item.tagID.toString(),
    });
  });
  return results;
}

function pasteCitation(dict) {
  // TODO: Build citation according to a csl style sheet?

  saveRecent(dict.itemID);

  const prefs = Action.preferences;
  const creatorTypes = prefs.creatorTypes;
  const fields = prefs.fields;

  const data = File.readJSON(dataPath);

  const authorNames = data.itemCreators
    .filter(
      (item) =>
        item.itemID === dict.itemID &&
        item.creatorTypeID === creatorTypes.author
    )
    .map((item) => item.lastName);
  const editorNames = data.itemCreators
    .filter(
      (item) =>
        item.itemID === dict.itemID &&
        item.creatorTypeID === creatorTypes.editor
    )
    .map((item) => item.lastName);
  const otherNames = data.itemCreators
    .filter(
      (item) =>
        item.itemID === dict.itemID &&
        item.creatorTypeID !== creatorTypes.author &&
        item.creatorTypeID !== creatorTypes.editor
    )
    .map((item) => item.lastName);

  const creators =
    authorNames.length > 0
      ? authorNames
      : editorNames.length > 0
      ? editorNames
      : otherNames;

  // creators.sort();

  const creatorString =
    creators.length > 3
      ? `${creators[0]} et al.`
      : creators.length === 3
      ? `${creators[0]}, ${creators[1]} & ${creators[2]}`
      : creators.length > 0
      ? creators.join(' & ')
      : '';

  var institution = '';
  var title = '';

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

  var citation =
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
  var recentItems = Action.preferences.recentItems || [];

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
  var contents = File.getDirectoryContents('/Applications/');
  var name = '';
  contents.forEach(function (item) {
    if (item.startsWith('Zotero')) {
      name = item;
    }
  });

  var plist = File.readPlist('/Applications/' + name + '/Contents/Info.plist');

  var version = parseInt(plist.CFBundleVersion.split('.')[0]);

  if (version < 7) {
    return true;
  }
}

function isNewerActionVersion(lastUsedActionVersion, currentActionVersion) {
  const lastUsedParts = lastUsedActionVersion.split('.');
  const currentParts = currentActionVersion.split('.');
  for (var i = 0; i < currentParts.length; i++) {
    const a = ~~currentParts[i]; // parse int
    const b = ~~lastUsedParts[i]; // parse int
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

// SETTINGS

function settings() {
  if (Action.preferences.citationFormat == 'richText') {
    var formatIcon = 'rTemplate';
    var badge = 'Rich Text';
  } else if (Action.preferences.citationFormat == 'markdown') {
    var formatIcon = 'mTemplate';
    var badge = 'Markdown';
  } else {
    // var formatIcon = 'plainTemplate';
    var formatIcon = 'pasteTemplate';
    var badge = 'Plain';
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
  //
  const profilesDir = '~/Library/Application Support/Zotero/Profiles';

  const profile = File.getDirectoryContents(profilesDir)[0];

  const prefsPath = profilesDir + '/' + profile + '/prefs.js';

  const prefsPathContent = File.readText(prefsPath);

  const match = prefsPathContent.match(
    /user_pref\("extensions.zotero.dataDir",\s*"([^"]*)"\);/
  );

  if (match) {
    var zoteroDirectory = match[1] + '/';
  } else {
    var zoteroDirectory = LaunchBar.homeDirectory + '/Zotero/';
  }

  return zoteroDirectory;
}
