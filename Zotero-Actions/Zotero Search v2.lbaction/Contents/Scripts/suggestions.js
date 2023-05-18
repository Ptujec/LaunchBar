/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- sorting
- DataValueID suggestions?
- notes

*/

include('default.js');

function runWithString(string) {
  if (!File.exists(dataPath)) {
    return;
  }

  if (string != undefined && string.trim().length == 0) {
    return;
  }

  var data = File.readJSON(dataPath);

  string = string.toLowerCase();

  var suggestions = [];

  const tags = showTags(data);

  tags.forEach(function (item) {
    if (item.title.toLowerCase().includes(string)) {
      suggestions.push(item);
    }
  });

  data.creators.forEach(function (item) {
    if (item.lastName.toLowerCase().includes(string)) {
      suggestions.push({
        title: item.lastName,
        subtitle: item.firstName,
        icon: 'creatorTemplate',
      });
    }
    if (item.firstName.toLowerCase().includes(string)) {
      suggestions.push({
        title: item.lastName,
        subtitle: item.firstName,
        icon: 'creatorTemplate',
      });
    }
  });

  return suggestions;
}
