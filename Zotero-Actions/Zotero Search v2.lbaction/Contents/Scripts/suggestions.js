/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('default.js');
const prefs = Action.preferences;
const itemTypes = prefs.itemTypes;
const fields = prefs.fields;

function runWithString(string) {
  if (!File.exists(dataPath)) return;
  if (string != undefined && string.trim().length == 0) return;
  string = string.toLowerCase();

  const data = File.readJSON(dataPath);

  const icon = 'icon';

  // Tag suggestions
  const tagSuggestions = data.tags
    .filter((item) => item.title.toLowerCase().includes(string))
    .map((item) => ({ title: item.title, icon: icon }));

  // Title & Series suggestions
  const words = string.split(' ');
  const wordMap = new Map();
  words.forEach((word) => wordMap.set(word, true));

  const itemIDs = data.items
    .filter(
      (item) =>
        item.itemTypeID !== itemTypes.note &&
        item.itemTypeID !== itemTypes.attachment &&
        item.itemTypeID !== itemTypes.annotation
    )
    .map((item) => item.itemID);

  const titleSuggestions = data.meta
    .filter((item) => {
      if (
        (item.fieldID == fields.title ||
          item.fieldID == fields.encyclopediaTitle ||
          item.fieldID == fields.dictionaryTitle ||
          item.fieldID == fields.caseName ||
          item.fieldID == fields.nameOfAct ||
          item.fieldID == fields.subject ||
          item.fieldID == fields.series) &&
        itemIDs.includes(item.itemID)
      ) {
        let value = item.value.toLowerCase();
        let match = true;

        for (const word of wordMap.keys()) {
          if (!value.includes(word)) {
            match = false;
            break;
          }
        }
        return match;
      }
      return false;
    })
    .map((item) => ({ title: item.value, icon: icon }));

  // Creator suggestions
  const creatorSuggestions = data.itemCreators
    .flatMap((item) => [
      {
        name: item.lastName,
        match: item.lastName.toLowerCase().includes(string),
      },
      // {
      //   name: item.firstName,
      //   match: item.firstName.toLowerCase().includes(string),
      // },
    ])
    .filter((item) => item.match)
    .map((item) => ({ title: item.name, icon: icon }));

  // Collection suggestions
  const collectionSuggestions = data.collectionItems
    .flatMap((item) => [
      {
        name: item.collectionName,
        match: item.collectionName.toLowerCase().includes(string),
      },
    ])
    .filter((item) => item.match)
    .map((item) => ({ title: item.name, icon: icon }));

  // Combine suggestions and remove duplicates
  const combinedSuggestions = [
    ...creatorSuggestions.reverse(),
    ...tagSuggestions.reverse(),
    ...collectionSuggestions.reverse(),
    ...titleSuggestions.reverse(),
  ];

  // return combinedSuggestions;
  const uniqueSuggestions = Array.from(
    new Set(combinedSuggestions.map((suggestion) => suggestion.title))
  ).map((title) => ({ title: title, icon: icon }));

  return uniqueSuggestions;
}
