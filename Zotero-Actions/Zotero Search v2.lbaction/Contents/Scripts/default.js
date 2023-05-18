/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
Shell
- librarys (items by library bzw sammlung) ?

Javascript
- only copy db when mod dates don't match
- option to open pdf or url OR show in Zotero 
- search priorities 1: title, name 2: tag 3: note

Icons
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
  var itemDataValuesIDs = [];

  data.itemDataValues.forEach(function (item) {
    if (item.value.toLowerCase().includes(argument)) {
      itemDataValuesIDs.push(item.valueID);
    }
  });

  data.itemData.forEach(function (item) {
    if (itemDataValuesIDs.includes(item.valueID)) {
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
      // action: 'showCreators',
      // actionArgument: data,
      children: showCreators(data),
    },
    {
      title: 'Tags',
      icon: 'tagTemplate',
      // action: 'showTags',
      // actionArgument: data,
      children: showTags(data),
    },
    {
      title: 'Collections',
      icon: 'collectionTemplate',
      // action: 'showCreators',
      // actionArgument: data,
      children: showCollections(data),
    },
    {
      title: 'Titles',
      icon: 'titleTemplate',
      action: 'showTitles',
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

function showTitles(data) {
  var itemIDs = [];

  data.itemData.forEach(function (item) {
    if (item.fieldID == 110) {
      itemIDs.push(item.itemID);
    }
  });

  itemIDs.reverse();

  return showEntries(itemIDs, data);
}

// function showEntries(itemIDs, data) {
//   // LaunchBar.alert(itemIDs.length);
//   var result = [];

//   // Get title, creator and date for each itemID
//   itemIDs.forEach(function (itemID) {
//     var creators = [];
//     data.itemCreators.forEach(function (i) {
//       if (itemID == i.itemID) {
//         data.creators.forEach(function (j) {
//           if (j.creatorID == i.creatorID) {
//             creators.push(j.lastName + ', ' + j.firstName);
//           }
//         });
//       }
//     });
//     var title = '';
//     data.itemData.forEach(function (i) {
//       if (itemID == i.itemID && i.fieldID == 110) {
//         data.itemDataValues.forEach(function (j) {
//           if (j.valueID == i.valueID) {
//             title = j.value;
//           }
//         });
//       }
//     });

//     var url = '';
//     data.items.forEach(function (i) {
//       if (itemID == i.itemID) {
//         url = 'zotero://select/library/items/' + i.key;
//       }
//     });

//     result.push({
//       title: title,
//       subtitle: creators.join(' & '),
//       icon: 'zTemplate',
//       url: url,
//     });
//   });

//   return result;
// }

function showEntries(itemIDs, data) {
  var result = [];

  var attachmentItemIDs = {};
  var itemsMap = data.items.reduce((map, item) => {
    if (item.itemTypeID == 14) {
      attachmentItemIDs[item.itemID] = true;
    }
    map[item.itemID] = 'zotero://select/library/items/' + item.key;
    return map;
  }, {});

  // Create hash maps for faster lookups
  var creatorsMap = data.creators.reduce((map, creator) => {
    map[creator.creatorID] = creator.lastName + ', ' + creator.firstName;
    return map;
  }, {});

  var itemCreatorsMap = data.itemCreators.reduce((map, itemCreator) => {
    map[itemCreator.itemID] = map[itemCreator.itemID] || [];
    map[itemCreator.itemID].push(creatorsMap[itemCreator.creatorID]);
    return map;
  }, {});

  var itemDataMap = data.itemData.reduce((map, itemData) => {
    if (itemData.fieldID == 110) {
      data.itemDataValues.forEach((itemDataValue) => {
        if (itemDataValue.valueID == itemData.valueID) {
          map[itemData.itemID] = itemDataValue.value;
        }
      });
    }
    return map;
  }, {});

  var itemsMap = data.items.reduce((map, item) => {
    map[item.itemID] = 'zotero://select/library/items/' + item.key;
    return map;
  }, {});

  // Process itemIDs and build the result array
  itemIDs.forEach((itemID) => {
    if (!attachmentItemIDs[itemID]) {
      result.push({
        title: itemDataMap[itemID] || '',
        subtitle: itemCreatorsMap[itemID]
          ? itemCreatorsMap[itemID].join(' & ')
          : '',
        icon: 'zTemplate',
        url: itemsMap[itemID],
      });
    }
  });

  return result;
}
