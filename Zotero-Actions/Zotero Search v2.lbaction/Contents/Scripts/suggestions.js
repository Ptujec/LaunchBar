/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('default.js');

function runWithString(string) {
  if (!File.exists(dataPath)) return;
  if (string != undefined && string.trim().length == 0) return;

  var data = File.readJSON(dataPath);

  string = string.toLowerCase();

  var suggestions = [];

  const icon = 'icon';

  // Tag suggestions
  data.tags.forEach(function (item) {
    if (item.title.toLowerCase().includes(string)) {
      suggestions.push({
        title: item.title,
        icon: icon,
      });
    }
  });

  // Title & Series suggestions
  var itemIDs = [];

  data.items.forEach(function (item) {
    if (
      item.itemTypeID != 1 &&
      item.itemTypeID != 14 &&
      item.itemTypeID != 37
    ) {
      itemIDs.push(item.itemID);
    }
  });

  var words = string.toLowerCase().split(' ');

  data.metaAll.forEach(function (item) {
    let value = item.value.toLowerCase();
    let match = true;

    if (
      (item.fieldID == 110 || item.fieldID == 3) &&
      itemIDs.includes(item.itemID)
    ) {
      words.forEach(function (word) {
        if (value.indexOf(word) === -1) {
          match = false;
          return;
        }
      });

      if (match) {
        suggestions.push({
          title: item.value,
          icon: icon,
        });
      }
    }
  });

  // Creator suggestions
  data.creators.forEach(function (item) {
    if (item.lastName.toLowerCase().includes(string)) {
      suggestions.push({
        title: item.lastName,
        icon: icon,
      });
    }
    if (item.firstName.toLowerCase().includes(string)) {
      suggestions.push({
        title: item.firstName,
        icon: icon,
      });
    }
  });

  // Use filter() method to remove duplicates from suggestions array
  suggestions = suggestions.filter(
    (suggestion, index, self) =>
      index === self.findIndex((s) => s.title === suggestion.title)
  );

  return suggestions;
}
