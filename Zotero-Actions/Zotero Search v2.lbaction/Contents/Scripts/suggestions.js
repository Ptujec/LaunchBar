/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
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

  const icon = 'icon';

  data.tags.forEach(function (item) {
    if (item.title.toLowerCase().includes(string)) {
      suggestions.push({
        title: item.title,
        icon: icon,
      });
    }
  });

  // TODO: titles in suggestions (but without notes and attachments/annotations)
  // data.meta.forEach(function (item) {
  //   if (item.fieldID == 110 && item.value.toLowerCase().includes(string)) {
  //     suggestions.push({
  //       title: item.value,
  //       icon: icon,
  //     });
  //   }
  // });

  data.creators.forEach(function (item) {
    if (item.lastName.toLowerCase().includes(string)) {
      suggestions.push({
        title: item.lastName,
        // subtitle: item.firstName,
        icon: icon,
      });
    }
    if (item.firstName.toLowerCase().includes(string)) {
      suggestions.push({
        title: item.firstName,
        // title: item.lastName,
        // subtitle: item.firstName,
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
