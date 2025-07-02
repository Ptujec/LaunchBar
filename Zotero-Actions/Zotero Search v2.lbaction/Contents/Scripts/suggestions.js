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

  const { wasUpdated, data: updatedData } = checkAndUpdateData();
  const data = updatedData || loadData();

  const icon = 'icon';

  // Tag suggestions
  const tagSuggestions = new Set();
  for (const item of data.tags) {
    if (item.title.toLowerCase().includes(string)) {
      tagSuggestions.add({ title: item.title, icon: icon });
    }
  }

  // Title & Series suggestions
  const itemIDs = new Set();
  for (const item of data.items) {
    if (
      item.itemTypeID !== itemTypes.note &&
      item.itemTypeID !== itemTypes.attachment
    ) {
      itemIDs.add(item.itemID);
    }
  }

  const words = string.split(' ');
  const wordMap = new Map(words.map((word) => [word, true]));

  const titleSuggestions = new Set();
  for (const item of data.meta) {
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
        titleSuggestions.add({ title: item.value, icon: icon });
      }
    }
  }

  const creatorSuggestions = new Set();
  for (const item of data.itemCreators) {
    if (item.lastName.toLowerCase().includes(string)) {
      creatorSuggestions.add({
        title: item.lastName,
        icon: icon,
      });
    }
  }

  const collectionSuggestions = new Set();
  for (const item of data.collectionItems) {
    if (item.collectionName.toLowerCase().includes(string)) {
      collectionSuggestions.add({
        title: item.collectionName,
        icon: icon,
      });
    }
  }

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
