/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- titles in suggestions (but without notes and attachments/annotations)
- make sure Zotero is running before use the url command !! 
- details
  - booktitle for chapters
  - publisher
  - place
  - publication for magazines
  - serie für kommentare
  - abstract?
  - tags?
- attachment count?

- only copy db when mod dates don't match
- option to always update?
*/

const storagePath = LaunchBar.homeDirectory + '/Zotero/storage';

const dataPath = Action.supportPath + '/data.json';

const currentActionVersion = Action.version;

const lastUsedActionVersion = Action.preferences.lastUsedActionVersion ?? '0.1';

function run(argument) {
  // Check version
  if (isNewerVersion(lastUsedActionVersion, currentActionVersion)) {
    // Update data
    var updateJSON = true;

    // Save current version number
    Action.preferences.lastUsedActionVersion = Action.version;
  }

  // Create JSON Data from SQL database
  if (LaunchBar.options.commandKey || !File.exists(dataPath) || updateJSON) {
    var data = LaunchBar.execute('/bin/sh', './data.sh');
    File.writeText(data, dataPath);
  }

  var data = File.readJSON(dataPath);

  // Search in Storage
  if (LaunchBar.options.controlKey) {
    return searchInStorageDir(argument, data);
  }

  // Search or browse sql database
  if (argument != undefined) {
    return search(argument, data);
  } else {
    return show(data);
  }
}

function search(argument, data) {
  argument = argument.toLowerCase();
  var itemIDs = [];

  // Search in Tags
  var tagIDs = [];
  data.tags.forEach(function (item) {
    if (item.title.toLowerCase().includes(argument)) {
      tagIDs.push(item.tagID);
    }
  });

  data.itemTags.forEach(function (item) {
    if (tagIDs.includes(item.tagID)) {
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

  data.metaAll.forEach(function (item) {
    if (item.value.toLowerCase().includes(argument)) {
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

  // Filter duplicates
  itemIDs = [...new Set(itemIDs)];

  // Fallback to storage search if no itemIDs found
  if (itemIDs.length == 0) {
    return searchInStorageDir(argument, data);
  }

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

  // Filter duplicates
  itemIDs = [...new Set(itemIDs)];

  return showEntries(itemIDs, data);
}

function show(data) {
  return [
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
      title: 'All Entries',
      icon: 'libraryTemplate',
      action: 'showAllEntries',
      actionArgument: data,
    },
  ];
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

  // Get itemIDs that include the tagID
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

  // Get itemIDs that include the tagID
  var itemIDs = [];
  data.itemCreators.forEach(function (item) {
    if (item.creatorID == creatorID) {
      itemIDs.push(item.itemID);
    }
  });

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

  // Get itemIDs that include the tagID
  var itemIDs = [];
  data.collectionItems.forEach(function (item) {
    if (item.collectionID == collectionID) {
      itemIDs.push(item.itemID);
    }
  });

  return showEntries(itemIDs, data);
}

function showAllEntries(data) {
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
          url: itemsMap[itemID] ? itemsMap[itemID].url : '',
          itemID: itemID,
          creator: creator,
          date: date,
          title: title,
          icon: icon,
        },
      });
    }
  });

  return result;
}

function itemActions(dict) {
  const data = File.readJSON(dataPath);
  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(dict.url);
  } else if (LaunchBar.options.shiftKey) {
    // Paste citation & copy link to item
    // TODO: Build citation according to a csl style sheet?

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
    // var citationMDLink = '[' + citation + '](' + dict.url + ')';
    // LaunchBar.paste(citation);
    // LaunchBar.setClipboardString(dict.url);

    LaunchBar.executeAppleScript(
      // 'set the clipboard to "' + citationMDLink + '"',
      // 'delay 0.1',
      'set the clipboard to "' + dict.url + '"',
      'tell application "LaunchBar" to paste in frontmost application "' +
        citation +
        '"'
    );
  } else {
    // Show details
    const itemID = dict.itemID;
    var url = '';

    data.metaAll.forEach(function (item) {
      if (item.itemID == itemID) {
        if (item.fieldID == 1) {
          url = item.value;
        }
      }
    });

    details = [
      {
        title: dict.title,
        icon: dict.icon,
        url: url || dict.url,
      },
      {
        title: dict.creator,
        icon: 'creatorTemplate',
      },
      {
        title: dict.date,
        icon: 'calTemplate',
      },
      {
        title: url ?? '',
        url: url ?? '',
        icon: 'openTemplate',
      },
    ];

    // Attachments

    var paths = [];
    data.itemAttachments.forEach((item) => {
      if (itemID == item.parentItemID) {
        if (item.path != undefined) {
          paths.push({
            path:
              storagePath +
              '/' +
              item.key +
              '/' +
              item.path.split('storage:')[1],
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
          details[0].path = paths[i].path;
          details[0].subtitle = '';
          details[0].url = undefined;
          break;
        }
      }

      paths.forEach(function (item) {
        details.push({
          title: item.type.split('/')[1].toUpperCase() || '',
          path: item.path,
          subtitle: '',
          icon: '14Template',
        });
      });
    }

    return details;
  }
}

function isNewerVersion(lastUsedActionVersion, currentActionVersion) {
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

function initializeName(name) {
  return name
    .split(' ')
    .map((part, index) => (index === 0 ? part : part.charAt(0) + '.'))
    .join(' ');
}
