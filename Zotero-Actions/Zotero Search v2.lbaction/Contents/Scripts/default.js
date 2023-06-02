/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const storagePath = LaunchBar.homeDirectory + '/Zotero/storage';
const dataPath = Action.supportPath + '/data.json';

function run(argument) {
  // Create JSON Data from SQL database (it will only do that if the database has been updated)
  var data = LaunchBar.execute('/bin/sh', './data.sh');

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
  } else {
    return browse(data);
  }
}

// SEARCH
function search(argument, data) {
  argument = argument.toLowerCase();
  var itemIDs = [];

  // Search in Tags
  data.itemTags.forEach(function (item) {
    if (item.name.toLowerCase().includes(argument)) {
      itemIDs.push(item.itemID);
    }
  });

  // Search in Creators
  var creatorIDs = [];
  data.creators.forEach(function (item) {
    if (
      item.lastName.toLowerCase().includes(argument) ||
      item.firstName.toLowerCase().includes(argument)
    ) {
      creatorIDs.push(item.creatorID);
    }
  });

  data.itemCreators.forEach(function (item) {
    if (creatorIDs.includes(item.creatorID)) {
      itemIDs.push(item.itemID);
    }
  });

  // Search all Files (including title, place, publisher, isbn)

  var words = argument.toLowerCase().split(' ');

  data.metaAll.forEach(function (item) {
    let value = item.value.toLowerCase();
    let match = true;

    words.forEach(function (word) {
      if (value.indexOf(word) === -1) {
        match = false;
        return;
      }
    });

    if (match) {
      itemIDs.push(item.itemID);
    }
  });

  // Search in Notes
  data.itemNotes.forEach(function (item) {
    if (
      item.note
        .replace(/(<([^>]+)>)/g, '') // remove HTML tags
        .toLowerCase()
        .includes(argument)
    ) {
      itemIDs.push(item.parentItemID);
    }
  });

  // Search in Storage (fallback if no itemIDs found or by holding cmd)
  if (itemIDs.length == 0 || LaunchBar.options.commandKey) {
    itemIDs = itemIDs.concat(searchInStorageDir(argument, data));
  }

  // Filter duplicates
  itemIDs = [...new Set(itemIDs)];

  return showEntries(itemIDs, data);
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
        acc.push(item.parentItemID);
      }
    });

    return acc;
  }, []);

  return itemIDs;
}

// BROWSE
function browse(data) {
  var result =
    showEntries(Action.preferences.recents || [], data).reverse() || [];

  result.push(
    {
      title: 'Creators',
      icon: 'creatorTemplate',
      children: showCreators(data),
    },
    {
      title: 'Tags',
      icon: 'tagTemplate',
      children: showTags(data),
    },
    {
      title: 'Collections',
      icon: 'collectionTemplate',
      children: showCollections(data),
    },
    {
      title: 'All Items',
      icon: 'libraryTemplate',
      action: 'showAllItems',
      actionArgument: data,
    }
  );

  return result;
}

function showTags(data) {
  data.tags.forEach(function (item) {
    item.icon = 'tagTemplate';
    item.action = 'showItemsWithTag';
    item.actionArgument = item.tagID.toString();
  });

  data.tags.sort(function (a, b) {
    return a.title > b.title;
  });

  return data.tags;
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

  return showEntries(itemIDs, data);
}

function showCreators(data) {
  var results = [];

  data.creators.forEach(function (item) {
    results.push({
      title: item.lastName + ', ' + item.firstName,
      icon: 'creatorTemplate',
      action: 'showItemsWithCreator',
      actionArgument: item.creatorID.toString(),
    });
  });

  results.sort(function (a, b) {
    return a.title > b.title;
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

  return showEntries(itemIDs, data);
}

function showCollections(data) {
  var results = [];

  data.collections.forEach(function (item) {
    results.push({
      title: item.collectionName,
      icon: 'collectionTemplate',
      action: 'showItemsWithCollection',
      actionArgument: item.collectionID.toString(),
      // children: showItemsWithCollection(item.collectionID.toString()),
    });
  });

  results.sort(function (a, b) {
    return a.title > b.title;
  });

  return results;
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

  return showEntries(itemIDs, data);
}

function showAllItems(data) {
  var itemIDs = [];

  data.meta.forEach(function (item) {
    if (item.fieldID == 110) {
      itemIDs.push(item.itemID);
    }
  });

  itemIDs.reverse();

  return showEntries(itemIDs, data);
}

function showEntries(itemIDs, data) {
  var result = [];

  const deletedItemIDs = new Set(data.deletedItems.map((item) => item.itemID));

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
      url: 'zotero://select/library/items/' + item.key,
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

  var itemTitleMap = data.meta.reduce((map, meta) => {
    if (meta.fieldID == 110) {
      map[meta.itemID] = meta.value;
    }
    return map;
  }, {});

  var itemDateMap = data.meta.reduce((map, meta) => {
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
    '21',
    '25',
    '26',
    '28',
    '30',
    '31',
    '37',
  ]);

  itemIDs.forEach((itemID) => {
    if (!attachmentItemIDs[itemID] && !deletedItemIDs.has(itemID)) {
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

      result.push({
        title: title,
        subtitle: creator + date,
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
    saveRecent(dict.itemID);

    if (checkVersion()) {
      LaunchBar.executeAppleScript(
        'tell application id "org.zotero.zotero" to launch'
      );
    }

    LaunchBar.openURL(dict.zoteroURL);
  } else if (LaunchBar.options.shiftKey) {
    saveRecent(dict.itemID);
    pasteCitation(dict);
  } else {
    return showItemDetails(dict);
  }
}

function showItemDetails(dict) {
  const data = File.readJSON(dataPath);

  const itemID = dict.itemID;
  var url = '';
  var journalTitle = '';
  var bookTitle = '';
  var seriesTitle = '';

  data.metaAll.forEach(function (item) {
    if (item.itemID == itemID) {
      if (item.fieldID == 1) {
        url = item.value;
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
  });

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
  var collections = [];
  var collectionsArr = [];

  data.collectionItems.forEach(function (item) {
    if (item.itemID == itemID) {
      collectionsArr.push({
        collectionName: item.collectionName,
        collectionID: item.collectionID,
      });
      collections.push(item.collectionName);
    }
  });

  // Tags
  var tags = [];
  var tagsArr = [];
  data.itemTags.forEach(function (item) {
    if (item.itemID == itemID) {
      tagsArr.push({
        name: item.name,
        tagID: item.tagID,
      });
      tags.push(item.name);
    }
  });

  dict.url = url;

  details = [
    {
      title: dict.title,
      icon: dict.icon,
      // url: url || dict.url,
      action: 'itemDetailActions',
      actionArgument: dict,
    },
    {
      title: dict.creator,
      icon: 'creatorTemplate',
      children: showItemCreatorIDs(creatorsArr, data),
    },
    {
      title: dict.date,
      icon: 'calTemplate',
    },
  ];

  if (journalTitle) {
    details.push({
      title: journalTitle,
      // icon: 'journalTemplate',
      icon: dict.icon + 'Template',
      action: 'showJournalArticles',
      actionArgument: journalTitle,
      // children: showItemJournalArticles(journalTitle)
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

  details.push(
    {
      title: collections.join(', '),
      icon: 'collectionTemplate',
      children: showItemCollections(collectionsArr),
    },
    {
      title: tags.join(', '),
      icon: 'tagTemplate',
      children: showItemTags(tagsArr),
    },
    {
      title: 'Cite and Link',
      icon: 'citeTemplate',
      action: 'pasteCitation',
      actionArgument: dict,
    },
    {
      title: url ?? '',
      url: url ?? '',
      icon: 'openTemplate',
    },
    {
      title: 'Open in Zotero',
      icon: 'openTemplate',
      url: dict.zoteroURL,
    }
  );

  // Attachments

  var paths = [];
  data.itemAttachments.forEach((item) => {
    if (itemID == item.parentItemID) {
      if (item.path != undefined) {
        paths.push({
          path:
            storagePath + '/' + item.key + '/' + item.path.split('storage:')[1],
          type: item.contentType,
        });
      }
    }
  });

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
      details.push({
        title: item.path.split('.').slice(-1)[0].toUpperCase() || '',
        path: item.path,
        subtitle: '',
        icon: '14Template',
      });
    });
  }

  return details;
}

function itemDetailActions(dict) {
  // Save as Recent
  saveRecent(dict.itemID);

  // Options
  if (LaunchBar.options.commandKey) {
    if (checkVersion()) {
      LaunchBar.executeAppleScript(
        'tell application id "org.zotero.zotero" to launch'
      );
    }

    LaunchBar.openURL(dict.zoteroURL);
    return;
  }

  if (LaunchBar.options.shiftKey) {
    return pasteCitation(dict);
  }

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

function showItemCreatorIDs(creatorsArr, data) {
  if (creatorsArr.length == 1) {
    return showItemsWithCreator(creatorsArr[0]);
  }

  var results = [];
  data.creators.forEach(function (item) {
    if (creatorsArr.includes(item.creatorID)) {
      results.push({
        title: item.lastName + ', ' + item.firstName,
        icon: 'creatorTemplate',
        action: 'showItemsWithCreator',
        actionArgument: item.creatorID.toString(),
      });
    }
  });
  return results;
}

function showItemCollections(collectionsArr) {
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

function showItemTags(tagsArr) {
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

function saveRecent(itemID) {
  var recents = Action.preferences.recents || [];

  // Check if itemID exists in the recents array
  if (recents.indexOf(itemID) > -1) {
    // Move the item to the end of the array
    recents.splice(recents.indexOf(itemID), 1);
    recents.push(itemID);
  } else {
    // Add the item to the array
    recents.push(itemID);
  }

  if (recents.length > 3) {
    recents.splice(0, 1);
  }

  Action.preferences.recents = recents;
}

function checkVersion() {
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

// SETTINGS

function settings() {
  if (Action.preferences.citationFormat == 'richText') {
    var formatIcon = 'rTemplate';
  } else if (Action.preferences.citationFormat == 'markdown') {
    var formatIcon = 'mTemplate';
  } else {
    var formatIcon = 'plainTemplate';
    var formatIcon = 'pasteTemplate';
  }

  return [
    {
      title: 'Citation Format',
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
