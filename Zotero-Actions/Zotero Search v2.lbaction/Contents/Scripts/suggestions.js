/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('global.js');

const itemTypes = Action.preferences.itemTypes;
const fields = Action.preferences.fields;

function runWithString(string) {
  if (string != undefined && string.trim().length == 0) return;
  string = string.toLowerCase();

  const data = getData();

  const icon = 'icon';

  // Tag suggestions
  const tagSuggestions = data.tags.reduce((acc, item) => {
    if (item.title.toLowerCase().includes(string)) {
      acc.add({ title: item.title, icon: icon });
    }
    return acc;
  }, new Set());

  // Title & Series suggestions
  const itemIDs = data.items.reduce((acc, item) => {
    if (
      item.itemTypeID !== itemTypes.note &&
      item.itemTypeID !== itemTypes.attachment
    ) {
      acc.add(item.itemID);
    }
    return acc;
  }, new Set());

  const words = string.split(' ');
  const wordMap = new Map(words.map((word) => [word, true]));

  const titleSuggestions = data.meta.reduce((acc, item) => {
    if (
      (item.fieldID == fields.title ||
        item.fieldID == fields.encyclopediaTitle ||
        item.fieldID == fields.dictionaryTitle ||
        item.fieldID == fields.caseName ||
        item.fieldID == fields.nameOfAct ||
        item.fieldID == fields.subject ||
        item.fieldID == fields.series) &&
      itemIDs.has(item.itemID)
    ) {
      let value = item.value.toLowerCase();
      let match = [...wordMap.keys()].every((word) => value.includes(word));

      if (match) {
        acc.add({ title: item.value, icon: icon });
      }
    }

    return acc;
  }, new Set());

  const creatorSuggestions = data.itemCreators.reduce((acc, item) => {
    const match = item.lastName.toLowerCase().includes(string);
    if (match) {
      acc.add({
        title: item.lastName,
        icon: icon,
      });
    }
    return acc;
  }, new Set());

  const collectionSuggestions = data.collectionItems.reduce((acc, item) => {
    const match = item.collectionName.toLowerCase().includes(string);
    if (match) {
      acc.add({
        title: item.collectionName,
        icon: icon,
      });
    }
    return acc;
  }, new Set());

  // Combine suggestions and remove duplicates
  const combinedSuggestions = [
    ...[...creatorSuggestions].reverse(),
    ...[...tagSuggestions].reverse(),
    ...[...collectionSuggestions].reverse(),
    ...[...titleSuggestions].reverse(),
  ];

  // return combinedSuggestions;
  const uniqueSuggestions = Array.from(
    new Set(combinedSuggestions.map((suggestion) => suggestion.title))
  ).map((title) => ({ title: title, icon: icon }));

  return uniqueSuggestions;
}
