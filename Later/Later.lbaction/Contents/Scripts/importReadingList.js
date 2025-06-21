/* 
Reading List Import
by Christian Bender (@ptujec)
2025-06-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const plistPath = '~/Library/Safari/Bookmarks.plist';

function importReadingList() {
  const plistContents = File.readPlist(plistPath);
  const listItems = plistContents?.Children[3]?.Children;

  if (listItems?.length === 0 || !listItems) {
    return {
      title: 'Safari Reading List is empty',
      icon: 'alert',
      url: File.fileURLForPath('/Applications/Safari.app'),
    };
  }

  const now = new Date().toLocaleString('sv').replace(' ', 'T');
  const formattedItems = listItems.map((item) => ({
    url: item.URLString,
    title: item.URIDictionary.title,
    dateAdded: item.ReadingList.DateAdded.toLocaleString('sv').replace(
      ' ',
      'T'
    ),
  }));

  const jsonData = File.exists(jsonFilePath)
    ? File.readJSON(jsonFilePath)
    : { data: [] };

  const existingUrls = new Set(jsonData.data.map((item) => item.url));
  const newItems = formattedItems.filter((item) => !existingUrls.has(item.url));

  const archiveTime = Action.preferences.archiveTime || '14';
  const archiveTimeDisplay =
    ARCHIVE_TIME_OPTIONS[archiveTime] || ARCHIVE_TIME_OPTIONS['14'];

  const message = [
    `Found ${newItems.length} new item(s) to import from Safari Reading List.`,
    formattedItems.length - newItems.length > 0
      ? `${
          formattedItems.length - newItems.length
        } item(s) already exist in your list.`
      : null,
    archiveTime !== 'never'
      ? `Items older than ${archiveTimeDisplay} will be moved to archive.`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const response = LaunchBar.alert(
    'Import Safari Reading List',
    message,
    'Ok',
    'Cancel'
  );

  if (response === 1) {
    LaunchBar.hide();
    return;
  }

  createBackup(jsonFilePath);

  Object.assign(jsonData, {
    source: 'launchbar',
    edited: now,
    data: [...jsonData.data, ...newItems],
  });

  const updatedData = archiveItems(jsonData);
  File.writeJSON(updatedData, jsonFilePath);

  return run();
}
