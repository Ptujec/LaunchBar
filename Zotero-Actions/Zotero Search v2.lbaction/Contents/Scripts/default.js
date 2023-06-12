/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const storagePath = LaunchBar.homeDirectory + '/Zotero/storage';
const dataPath = Action.supportPath + '/data.json';

const currentActionVersion = Action.version;
const lastUsedActionVersion = Action.preferences.lastUsedActionVersion ?? '0.1';

function run(argument) {
  // Create JSON Data from SQL database. It will only do that if the database has been updated or if there is a new action version or if the JSON data has been removed (accidentally)

  if (isNewerActionVersion(lastUsedActionVersion, currentActionVersion)) {
    var updateJSON = true;

    Action.preferences.lastUsedActionVersion = Action.version;
  }

  if (!File.exists(dataPath)) {
    var updateJSON = true;
  }

  var data = LaunchBar.execute('/bin/sh', './data.sh', updateJSON);

  if (data) {
    File.writeText(data, dataPath);
  }

  // Show Settings
  if (LaunchBar.options.alternateKey) {
    return settings();
  }

  // Get data from JSON
  var data = File.readJSON(dataPath);

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

  // Search all Fields (including title, place, publisher, isbn)
  const words = argument.split(' ');
  const wordMap = new Map(words.map((word) => [word, true]));
  const metaAllIDs = data.metaAll
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
    ...metaAllIDs.reverse(),
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
    storagePath,
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

  const results = data.itemCreators.map((item) => {
    return {
      title: item.lastName + (item.firstName ? ', ' + item.firstName : ''),
      icon: 'creatorTemplate',
      action: 'showItemsWithCreator',
      actionArgument: item.creatorID.toString(),
    };
  });

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
  var data = File.readJSON(dataPath);

  var itemIDs = data.metaAll.reduce((accumulator, item) => {
    return item.fieldID == 110 ||
      item.fieldID == 111 ||
      item.fieldID == 112 ||
      item.fieldID == 113
      ? [...accumulator, item.itemID]
      : accumulator;
  }, []);

  return showEntries(itemIDs.reverse(), data);
}

function showEntries(itemIDs, data) {
  var result = [];

  // const deletedItemIDs = new Set(data.deletedItems.map((item) => item.itemID));

  var attachmentItemIDs = {};
  var itemsMap = data.items.reduce((map, item) => {
    if (
      item.itemTypeID == 14 ||
      item.itemTypeID == 1 ||
      item.itemTypeID == 37
    ) {
      attachmentItemIDs[item.itemID] = true;
    }
    map[item.itemID] = {
      url: 'zotero://select/items/' + item.libraryID + '_' + item.key,
      itemTypeID: item.itemTypeID,
    };
    return map;
  }, {});

  var itemCreatorsMap = data.itemCreators.reduce((map, itemCreator) => {
    map[itemCreator.itemID] = map[itemCreator.itemID] || [];
    map[itemCreator.itemID].push({
      name: [itemCreator.lastName, initializeName(itemCreator.firstName)]
        .filter(Boolean)
        .join(', '),
      typeID: itemCreator.creatorTypeID,
    });
    return map;
  }, {});

  var itemTitleMap = data.metaAll.reduce((map, meta) => {
    if (
      meta.fieldID == 110 ||
      meta.fieldID == 111 ||
      meta.fieldID == 112 ||
      meta.fieldID == 113
    ) {
      map[meta.itemID] = meta.value;
    }
    return map;
  }, {});

  var itemDateMap = data.metaAll.reduce((map, meta) => {
    if (meta.fieldID == 14) {
      map[meta.itemID] = meta.value;
    }
    return map;
  }, {});

  const templateIcons = new Set([
    '10',
    '11',
    '16',
    '17',
    '18',
    // '21',
    '25',
    '26',
    '28',
    '30',
    '31',
    '37',
  ]);

  itemIDs.forEach((itemID) => {
    // if (!attachmentItemIDs[itemID] && !deletedItemIDs.has(itemID)) {
    if (itemID in itemsMap && !attachmentItemIDs[itemID]) {
      const iconBase = itemsMap[itemID]
        ? itemsMap[itemID].itemTypeID.toString()
        : '34';
      const icon = templateIcons.has(iconBase)
        ? iconBase + 'Template'
        : iconBase;

      const creator = itemCreatorsMap[itemID]
        ? itemCreatorsMap[itemID]
            .filter((creator) => {
              const type1Exists = itemCreatorsMap[itemID].some(
                (c) => c.typeID === 1
              );
              if (type1Exists) {
                return creator.typeID === 1;
              }
              const type3Exists = itemCreatorsMap[itemID].some(
                (c) => c.typeID === 3
              );
              if (type3Exists) {
                return creator.typeID === 3;
              }
              return true;
            })
            .map((creator) => creator.name)
            .join(' & ') + ' '
        : '';

      const date = itemDateMap[itemID] ? itemDateMap[itemID].split('-')[0] : '';

      const title = itemTitleMap[itemID];
      const subtitle = creator + date;

      result.push({
        title: title || subtitle || '[Untitled]',
        subtitle: title ? subtitle : '',
        icon: icon,
        action: 'itemActions',
        actionArgument: {
          zoteroURL: itemsMap[itemID] ? itemsMap[itemID].url : '',
          itemID: itemID,
          creator: creator,
          date: date,
          title: title,
          icon: icon,
        },
      });
    }
  });

  // if (result.length === 1) {
  //   return showItemDetails(result[0].actionArgument);
  // }
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
  const itemID = dict.itemID;
  const data = File.readJSON(dataPath);

  let journalTitle, bookTitle, seriesTitle;

  const attachedUrlsItemIDs = [];

  const paths = data.itemAttachments
    .filter((item) => itemID == item.parentItemID)
    .map((item) => {
      if (item.path) {
        return {
          path:
            storagePath + '/' + item.key + '/' + item.path.split('storage:')[1],
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

  data.metaAll.forEach((item) => {
    if (item.itemID == itemID) {
      if (item.fieldID == 1) {
        urls.push({
          urlTitle: item.value,
          url: item.value,
        });
      }
      if (item.fieldID == 3) {
        seriesTitle = item.value;
      }
      if (item.fieldID == 12) {
        journalTitle = item.value;
      }
      if (item.fieldID == 115) {
        bookTitle = item.value;
      }
    }

    if (
      attachedUrlsItemIDs.includes(item.itemID) &&
      (item.fieldID == 1 || item.fieldID == 110)
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

    if (entry.fieldID === 1) {
      existingItem.url = entry.value;
    } else if (entry.fieldID === 110) {
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
    .filter((item) => item.itemID === dict.itemID && item.creatorTypeID === 1)
    .map((item) => item.creatorID);
  const editorIDs = data.itemCreators
    .filter((item) => item.itemID === dict.itemID && item.creatorTypeID === 3)
    .map((item) => item.creatorID);
  const otherIDs = data.itemCreators
    .filter(
      (item) =>
        item.itemID === dict.itemID &&
        item.creatorTypeID !== 1 &&
        item.creatorTypeID !== 3
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
    details.push({
      title: dict.creator,
      icon: 'creatorTemplate',
      // children: showItemCreatorIDs(creatorsArr),
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
      // children: showItemCollections(collectionsArr),
      action: 'showItemCollections',
      actionArgument: {
        collectionsArr: collectionsArr,
      },
    });
  }

  if (tags.length > 0) {
    details.push({
      title: tags.join(', '),
      icon: 'tagTemplate',
      // children: showItemTags(tagsArr),
      action: 'showItemTags',
      actionArgument: {
        tagsArr: tagsArr,
      },
    });
  }

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
      // var title = item.path.split('.').slice(-1)[0].toUpperCase() || ''; // only extension in upper case
      var title = item.path.split('/').slice(-1)[0] || ''; // whole name with extension
      details.push({
        title: title,
        path: item.path,
        subtitle: '',
        icon: '14Template',
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

  data.metaAll.forEach(function (item) {
    if (
      item.fieldID == '115' &&
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

  data.metaAll.forEach(function (item) {
    if (
      item.fieldID == '3' &&
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

  data.metaAll.forEach(function (item) {
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

  var results = [];
  data.creators.forEach(function (item) {
    if (creatorsArr.includes(item.creatorID)) {
      results.push({
        title: item.lastName + (item.firstName ? ', ' + item.firstName : ''),
        icon: 'creatorTemplate',
        action: 'showItemsWithCreator',
        actionArgument: item.creatorID.toString(),
      });
    }
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

  const data = File.readJSON(dataPath);

  const authorNames = data.itemCreators
    .filter((item) => item.itemID === dict.itemID && item.creatorTypeID === 1)
    .map((item) => item.lastName);
  const editorNames = data.itemCreators
    .filter((item) => item.itemID === dict.itemID && item.creatorTypeID === 3)
    .map((item) => item.lastName);
  const otherNames = data.itemCreators
    .filter(
      (item) =>
        item.itemID === dict.itemID &&
        item.creatorTypeID !== 1 &&
        item.creatorTypeID !== 3
    )
    .map((item) => item.lastName);

  const creators =
    authorNames.length > 0
      ? authorNames
      : editorNames.length > 0
      ? editorNames
      : otherNames;
  const creatorString =
    creators.length > 2 ? `${creators[0]} et al.` : creators.join(' & ');

  var citation = '(' + creatorString + ', ' + dict.date + ')';

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
      // 'set the clipboard to "' + citationMDLink + '"',
      // 'delay 0.1',
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
