/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- title in suggestions
- option to open pdf or url OR show in Zotero?
- show details for items?
- make sure Zotero is running before use the url command !! 
- attachment count?

- only copy db when mod dates don't match
- option to always update?
*/

const dataPath = Action.supportPath + '/data.json';

function run(argument) {
  // Create JSON Data from SQL database
  if (LaunchBar.options.commandKey || !File.exists(dataPath)) {
    var data = LaunchBar.execute('/bin/sh', './data.sh');
    File.writeText(data, dataPath);
  }

  var data = File.readJSON(dataPath);

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

  // Search in DataValues
  // var itemDataValuesIDs = [];

  // data.itemDataValues.forEach(function (item) {
  //   if (item.value.toLowerCase().includes(argument)) {
  //     itemDataValuesIDs.push(item.valueID);
  //   }
  // });

  // data.itemData.forEach(function (item) {
  //   if (itemDataValuesIDs.includes(item.valueID)) {
  //     itemIDs.push(item.itemID);
  //   }
  // });

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

  var creatorsMap = data.creators.reduce((map, creator) => {
    var creatorName = [creator.lastName, creator.firstName]
      .filter(Boolean)
      .join(', ');
    map[creator.creatorID] = creatorName;
    return map;
  }, {});

  var itemCreatorsMap = data.itemCreators.reduce((map, itemCreator) => {
    map[itemCreator.itemID] = map[itemCreator.itemID] || [];
    map[itemCreator.itemID].push(creatorsMap[itemCreator.creatorID]);
    return map;
  }, {});

  // var itemTitleMap = data.itemData.reduce((map, itemData) => {
  //   if (itemData.fieldID == 110) {
  //     data.itemDataValues.forEach((itemDataValue) => {
  //       if (itemDataValue.valueID == itemData.valueID) {
  //         map[itemData.itemID] = itemDataValue.value;
  //       }
  //     });
  //   }
  //   return map;
  // }, {});

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

  // var itemDateMap = data.itemData.reduce((map, itemData) => {
  //   if (itemData.fieldID == 14) {
  //     data.itemDataValues.forEach((itemDataValue) => {
  //       if (itemDataValue.valueID == itemData.valueID) {
  //         var year = itemDataValue.value.split('-')[0];
  //         map[itemData.itemID] = year;
  //       }
  //     });
  //   }
  //   return map;
  // }, {});

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
        : 'zTemplate';
      const icon = templateIcons.has(iconBase)
        ? iconBase + 'Template'
        : iconBase;

      const creator = itemCreatorsMap[itemID]
        ? itemCreatorsMap[itemID].join(' & ') + ' '
        : '';

      const date = itemDateMap[itemID] ? itemDateMap[itemID].split('-')[0] : '';

      const title = itemTitleMap[itemID];

      result.push({
        title: title,
        subtitle: creator + date,
        icon: icon,
        // url: itemsMap[itemID] ? itemsMap[itemID].url : '',
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
  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(dict.url);
  } else {
    // Show details
    const itemID = dict.itemID;
    const data = File.readJSON(dataPath);
    var url = '';

    data.metaAll.forEach(function (item) {
      if (item.itemID == itemID) {
        if (item.fieldID == 1) {
          url = item.value;
        }
      }
    });

    return [
      {
        title: dict.title,
        icon: dict.icon,
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
        icon: 'arrowTemplate',
      },
    ];
  }
}