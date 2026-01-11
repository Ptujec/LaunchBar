/*
Later Action for LaunchBar Test
by Christian Bender (@ptujec)
2026-01-11

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('importReadingList.js');

const defaultStorageDirectory = `${LaunchBar.homeDirectory}/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents`;

const storageDirectory =
  Action.preferences.storageDirectory || defaultStorageDirectory;

const jsonFilePath = `${storageDirectory}/later.json`;
const archiveFilePath = `${Action.supportPath}/archive.json`;
const backupDir = `${Action.supportPath}/backups`;

const maxItems = 20; // Items will be archived if the list exceeds this number
const maxBackups = 10; // Maximum number of backups to keep

const ARCHIVE_TIME_OPTIONS = {
  7: '7 Days',
  14: '14 Days',
  30: '1 Month',
  90: '3 Months',
  never: 'Never',
};

const shortcutURLAddToLater =
  'https://www.icloud.com/shortcuts/9a64a6c48e4d4ad7aa7cfee0694c36a9';
const shortcutURLShowLater =
  'https://www.icloud.com/shortcuts/cedf5b879dd94cdd8b142d9e09585388';
const shortcutURLAddToLaterMac =
  'https://www.icloud.com/shortcuts/60264ed63f484f0fbd98c76c4ddbb748';

// MARK: - Main

function runWithURL(url) {
  LaunchBar.hide();

  let ytId, twitchId, time;
  if (url.includes('youtu')) [url, ytId] = handleYoutubeUrl(url, time);
  if (url.includes('twitch.tv')) [url, twitchId] = handleTwitchUrl(url, time);

  let title = LaunchBar.execute('/bin/bash', './getTitle.sh', url).trim();

  title = cleanupTitle(title);

  if (!title || title === '') title = url;

  addLink({ url, title, ytId, twitchId });
}

function run() {
  if (LaunchBar.options.controlKey) return settings();
  if (!LaunchBar.options.commandKey) return showList();

  LaunchBar.hide();

  const [appId, appName, isSupported] = LaunchBar.execute(
    '/bin/bash',
    './appInfo.sh'
  )
    .trim()
    .split('\n');

  if (isSupported === 'false') {
    LaunchBar.alert(appName + ' is not a supported browser!');
    LaunchBar.hide();
    return;
  }

  const info = getInfoFromBrowser(appId).trim().split('\n');

  let url = info[0]?.trim();
  const title = info[1] ? cleanupTitle(info[1]) : url;
  const time = info[2] ? info[2].trim() : null;

  if (!url || url === '') {
    LaunchBar.alert('No URL found in the current tab of ' + appName);
    LaunchBar.hide();
    return;
  }

  let ytId, twitchId;
  if (url.includes('youtu')) {
    [url, ytId] = handleYoutubeUrl(url, time);
  }
  if (url.includes('twitch.tv')) {
    [url, twitchId] = handleTwitchUrl(url, time);
  }

  addLink({ url, title, ytId, twitchId });
}

// MARK: - Show List

function showList(forceArchive = false) {
  const isArchived = forceArchive || LaunchBar.options.alternateKey;
  const jsonFilePathToUse = isArchived ? archiveFilePath : jsonFilePath;

  // LaunchBar.log(`jsonFilePathToUse: ${jsonFilePathToUse}`);

  const list = File.exists(jsonFilePathToUse)
    ? File.readJSON(jsonFilePathToUse).data
    : [];

  if (list?.length === 0 || !list) {
    if (isArchived) {
      LaunchBar.alert('No items found in archive!');
    } else {
      LaunchBar.alert(
        'No items found!',
        'Hold ⌘ to add the current website from your browser! Hold ⌥ to view archived items.'
      );
    }
    return {
      title: 'Later',
      icon: 'glassesTemplate',
      action: 'run',
      actionReturnsItems: true,
    };
  }

  // Filter out duplicate URLs, keep only the most recent occurrence
  const uniqueList = Array.from(
    list
      .reduce((map, current) => {
        const existing = map.get(current.url);
        const existingDate = existing ? new Date(existing.dateAdded) : null;
        const currentDate = new Date(current.dateAdded);
        if (!existing || currentDate > existingDate) {
          map.set(current.url, current);
        }
        return map;
      }, new Map())
      .values()
  );

  if (uniqueList.length !== list.length) {
    const now = new Date().toLocaleString('sv').replace(' ', 'T');
    File.writeJSON(
      {
        data: uniqueList,
        source: 'launchbar',
        edited: now,
      },
      jsonFilePathToUse
    );
  }

  return uniqueList
    .map((item, index) => ({
      title: item.title,
      subtitle: item.url !== item.title ? item.url : '',
      alwaysShowsSubtitle: true,
      url: item.url, // for QuickLook & Sending to other than default browser
      badge: jsonFilePathToUse === archiveFilePath ? 'Archived' : undefined,
      action: 'handleListItem',
      actionArgument: { url: item.url, index, jsonFilePathToUse },
      icon: 'glassesTemplate',
      dateAdded: item.dateAdded,
    }))
    .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
}

// MARK: - Paste or Remove Items

function handleListItem({ index, url, jsonFilePathToUse }) {
  if (LaunchBar.options.shiftKey) {
    LaunchBar.paste(url);
    return;
  }

  if (
    Action.preferences.removeOnOpen !== false ||
    LaunchBar.options.commandKey
  ) {
    if (jsonFilePathToUse !== archiveFilePath) createBackup(jsonFilePathToUse);

    const jsonData = File.readJSON(jsonFilePathToUse);
    jsonData.data.splice(index, 1);
    jsonData.source = 'launchbar';
    jsonData.edited = new Date().toLocaleString('sv').replace(' ', 'T');

    File.writeJSON(jsonData, jsonFilePathToUse);
  }

  if (!LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL(url);
    return;
  }

  if (!LaunchBar.options.alternateKey) {
    return showList(jsonFilePathToUse === archiveFilePath);
  }
}

// MARK: - Add Items

function addLink({ url, title, ytId, twitchId }) {
  const now = new Date().toLocaleString('sv').replace(' ', 'T');

  createBackup(jsonFilePath);

  const jsonData = File.exists(jsonFilePath)
    ? File.readJSON(jsonFilePath)
    : { data: [] };
  jsonData.source = 'launchbar';
  jsonData.edited = now;

  jsonData.data = jsonData.data.filter((item) => {
    if (ytId) return !item.url.includes(ytId);
    if (twitchId) return !item.url.includes(twitchId);
    return item.url !== url;
  });

  jsonData.data = [
    ...jsonData.data,
    {
      url,
      title,
      dateAdded: now,
    },
  ];

  const updatedData = cleanupList(jsonData);

  File.writeJSON(updatedData, jsonFilePath);
}

function getInfoFromBrowser(appID) {
  if (appID === 'org.mozilla.firefox' || appID === 'app.zen-browser.zen') {
    LaunchBar.executeAppleScript(`
      tell application id "${appID}" to activate
      delay 0.2
      tell application "System Events"
        keystroke "l" using {command down}
        delay 0.2
        keystroke "c" using {command down}
        delay 0.2
        key code 53
      end tell
      delay 0.2
      if ${LaunchBar.options.alternateKey === 0} then
        tell application id "${appID}" to close front window
      end if
    `);
    return LaunchBar.getClipboardString();
  }

  const script =
    appID == 'com.apple.Safari' || appID == 'com.kagi.kagimacOS'
      ? `
    tell application id "${appID}"
        set _url to URL of front document
        set _name to name of front document
        set _time to ""
        if (_url contains "youtube.com") or (_url contains "twitch.tv") then
          try
              set _time to (do JavaScript "String(Math.round(document.querySelector('video').currentTime))" in front document) as string
          on error e
              -- do nothing
          end try
        end if
        if ${LaunchBar.options.alternateKey === 0} then
            close current tab of window 1
        end if
        return _url & "\n" & _name & "\n" & _time
    end tell`
      : `
    tell application id "${appID}"
        set _url to URL of active tab of front window
        set _name to title of active tab of front window
        set _time to ""
        if (_url contains "youtube.com") or (_url contains "twitch.tv") then
          try
            set _time to (execute active tab of front window javascript "String(Math.round(document.querySelector('video').currentTime))")
          on error e
            -- do nothing
          end try
        end if
        if ${LaunchBar.options.alternateKey === 0} then
            close active tab of window 1
        end if
        return _url & "\n" & _name & "\n" & _time
    end tell`;

  return LaunchBar.executeAppleScript(script).trim();
}

// MARK: - Cleanup List & Archive

function cleanupList(jsonData) {
  const archiveTime = Action.preferences.archiveTime || '14';
  if (archiveTime === 'never') return jsonData;

  const archiveDays = parseInt(archiveTime, 10);

  // Don't archive if there are less than maxItems
  if (jsonData.data.length < maxItems) {
    return jsonData;
  }

  const now = new Date();
  const archiveDaysAgo = new Date(
    now.getTime() - archiveDays * 24 * 60 * 60 * 1000
  );

  // Filter out items older than archiveDays
  const toArchive = jsonData.data.filter(
    (item) => item.dateAdded && new Date(item.dateAdded) < archiveDaysAgo
  );

  jsonData.data = jsonData.data.filter(
    (item) => !item.dateAdded || new Date(item.dateAdded) >= archiveDaysAgo
  );

  if (toArchive.length > 0) {
    const archiveData = File.exists(archiveFilePath)
      ? File.readJSON(archiveFilePath)
      : { data: [] };

    // Get URLs that are already in the archive
    const existingUrls = new Set(archiveData.data.map((item) => item.url));

    // Filter out any items that are already in the archive
    const uniqueToArchive = toArchive.filter(
      (item) => !existingUrls.has(item.url) && item.url !== ''
    );

    // Update archive data with unique items
    archiveData.data = [...archiveData.data, ...uniqueToArchive];
    File.writeJSON(archiveData, archiveFilePath);

    if (uniqueToArchive.length > 0) {
      LaunchBar.displayNotification({
        title: 'Later Action',
        subtitle: `Archived ${uniqueToArchive.length} new item(s).\nHold ⌥ to view archived items!`,
      });
    }
  }

  return jsonData;
}

// MARK: - Helper Functions

function handleYoutubeUrl(url, time) {
  // LaunchBar.log(`Handling YouTube URL: ${url} with time: ${time}`);

  const baseUrl = 'https://www.youtube.com/watch?v=';

  let ytId;

  if (url.includes('youtu.be')) {
    ytId = url.split('youtu.be/')[1]?.split('?')[0];
  } else {
    ytId = url.split('v=')[1]?.split('&')[0];
  }

  if (!ytId) return [url, ytId];

  url =
    `${baseUrl}${ytId}` +
    ((time && parseFloat(time)) > 10 ? `&t=${time}s` : '');

  return [url, ytId];
}

function handleTwitchUrl(url, time) {
  // LaunchBar.log(`Handling Twitch URL: ${url} with time: ${time}`);

  const baseUrl = 'https://www.twitch.tv/videos/';

  const videoIdMatch = url.match(/\/videos\/(\d+)/);
  if (!videoIdMatch) return [url, null];

  const videoId = videoIdMatch[1];

  url =
    `${baseUrl}${videoId}` +
    ((time && parseFloat(time)) > 10 ? `?t=${time}s` : '');

  return [url, videoId];
}

function cleanupTitle(title) {
  if (!title) return '';
  return title
    .decodeHTMLEntities()
    .replace(/^\(\d+\)/g, '') // remove tab number prefix like "(1) "
    .replace(' - YouTube', '')
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim();
}

// MARK: - Settings

function settings() {
  const archiveTime = Action.preferences.archiveTime || '14';
  const removeOnOpen = Action.preferences.removeOnOpen !== false; // default to true

  const hasBackups =
    File.exists(backupDir) &&
    File.getDirectoryContents(backupDir).some((file) => file.endsWith('.json'));

  const hasArchive =
    File.exists(archiveFilePath) &&
    File.readJSON(archiveFilePath)?.data?.length > 0;

  return [
    {
      title: removeOnOpen
        ? 'Remove Items When Opened'
        : 'Keep Items When Opened',
      subtitle: removeOnOpen
        ? 'Items will be removed from the list when opened.'
        : 'Items will not be removed from the list when opened.',
      alwaysShowsSubtitle: true,
      icon: removeOnOpen ? 'removeListItemTemplate' : 'listTemplate',
      action: 'toggleRemoveOnOpen',
    },
    {
      title: 'Set Archive Time Period',
      subtitle:
        archiveTime !== 'never'
          ? 'Items will be archived if the list exceeds 20 items.'
          : undefined,
      alwaysShowsSubtitle: true,
      icon: 'gridTemplate',
      badge: ARCHIVE_TIME_OPTIONS[archiveTime] || ARCHIVE_TIME_OPTIONS['14'],
      action: 'showArchiveTimeOptions',
      actionReturnsItems: true,
    },
    hasArchive
      ? {
          title: 'Restore Items From Archive',
          subtitle: 'Move all archived items back to the main list.',
          alwaysShowsSubtitle: true,
          icon: 'restoreArchiveTemplate',
          action: 'restoreFromArchive',
        }
      : undefined,
    hasArchive
      ? {
          title: 'Remove Archive',
          subtitle: 'Permanently delete the archive file.',
          alwaysShowsSubtitle: true,
          icon: 'removeArchiveTemplate',
          action: 'removeArchive',
        }
      : undefined,
    {
      title: 'Choose List Location',
      subtitle: storageDirectory.replace(LaunchBar.homeDirectory, '~'),
      alwaysShowsSubtitle: true,
      icon: 'folderTemplate',
      action: 'chooseDirectory',
    },
    hasBackups
      ? {
          title: 'Restore From Backup',
          subtitle: 'Choose a backup to restore from.',
          alwaysShowsSubtitle: true,
          icon: 'restoreTemplate',
          action: 'showBackups',
          actionReturnsItems: true,
        }
      : undefined,
    storageDirectory.includes('/Library/Mobile Documents/')
      ? {
          title: 'Resolve iCloud Conflicts',
          subtitle: 'Items will be merged if there are conflicts.',
          alwaysShowsSubtitle: true,
          action: 'resolveICloudConflicts',
          actionRunsInBackground: true,
          icon: 'cloudSparkleTemplate',
        }
      : undefined,
    {
      title: 'Import Safari Reading List Items',
      subtitle:
        archiveTime !== 'never'
          ? 'Older items will be automatically archived.'
          : undefined,
      alwaysShowsSubtitle: true,
      action: 'importReadingList',
      icon: 'importTemplate',
    },
    {
      title: 'Install "Add To Later (via LaunchBar)" Shortcut',
      subtitle:
        'This shortcut lets you add links via the context menu on macOS.',
      alwaysShowsSubtitle: true,
      url: shortcutURLAddToLaterMac,
      icon: 'shortcutsTemplate',
    },
    storageDirectory === defaultStorageDirectory
      ? {
          title: 'Install "Add to Later" Shortcut',
          subtitle:
            'This shortcut lets you add links via the share sheet on iOS.',
          alwaysShowsSubtitle: true,
          url: shortcutURLAddToLater,
          icon: 'shortcutsTemplate',
        }
      : undefined,
    storageDirectory === defaultStorageDirectory
      ? {
          title: 'Install "Later" Shortcut',
          subtitle: 'This shortcut lists items on iOS so you can open them.',
          alwaysShowsSubtitle: true,
          url: shortcutURLShowLater,
          icon: 'shortcutsTemplate',
        }
      : undefined,
  ];
}

function toggleRemoveOnOpen() {
  const currentValue = Action.preferences.removeOnOpen !== false;
  Action.preferences.removeOnOpen = !currentValue;
  return settings();
}

function chooseDirectory() {
  LaunchBar.hide();

  const directory = LaunchBar.executeAppleScript(
    `tell application "Finder"
       activate
       set defaultPath to (POSIX file "${storageDirectory}") as alias
       set selectedFolder to choose folder default location defaultPath
       set selectedPath to POSIX path of selectedFolder
    end tell`
  )
    .trim()
    .replace(/\/$/, '');

  if (directory === '') return;

  Action.preferences.storageDirectory = directory;
}

// MARK: - Archive Management

function showArchiveTimeOptions() {
  const archiveTime = Action.preferences.archiveTime || '14';

  return Object.entries(ARCHIVE_TIME_OPTIONS).map(([days, label]) => ({
    title: days === 'never' ? label : `Archive After ${label}`,
    icon: archiveTime === days ? 'checkTemplate' : 'circleTemplate',
    action: 'setArchiveTime',
    actionArgument: days,
  }));
}

function setArchiveTime(archiveTime) {
  Action.preferences.archiveTime = archiveTime || '14'; // Default to 14 days if no time is provided
  return settings();
}

function removeArchive() {
  if (!File.exists(archiveFilePath)) {
    LaunchBar.alert('No archive found!');
    return;
  }

  const response = LaunchBar.alert(
    'Remove Archive',
    'Are you sure you want to permanently delete all archived items? This cannot be undone.',
    'Remove',
    'Cancel'
  );

  if (response !== 0) return;

  LaunchBar.execute('/bin/rm', archiveFilePath);
  LaunchBar.displayNotification({
    title: 'Later Action',
    string: 'Archive removed successfully!',
  });

  return settings();
}

function restoreFromArchive() {
  if (!File.exists(archiveFilePath)) {
    LaunchBar.alert('No archive found!');
    return;
  }

  const archiveData = File.readJSON(archiveFilePath);
  if (!archiveData?.data?.length) {
    LaunchBar.alert('No items in archive yet');
    return;
  }

  const response = LaunchBar.alert(
    'Restore Archive',
    `Are you sure you want to move all archived items back to the main list? ${
      Action.preferences.archiveTime !== 'never'
        ? 'Dates will be set to the current date to prevent immediate re-archiving.'
        : ''
    }
The archive file will be deleted after restoring.`,
    'Restore',
    'Cancel'
  );

  if (response !== 0) return;

  createBackup(jsonFilePath);

  const mainData = File.exists(jsonFilePath)
    ? File.readJSON(jsonFilePath)
    : { data: [] };

  const now = new Date().toLocaleString('sv').replace(' ', 'T');
  const existingUrls = new Set(mainData.data.map((item) => item.url));

  // Filter out duplicates and update dates
  const uniqueArchiveItems = archiveData.data
    .filter((item) => !existingUrls.has(item.url))
    .map((item) => ({
      ...item,
      dateAdded: now, // Reset the date to avoid immediate re-archiving
    }));

  mainData.data = [...mainData.data, ...uniqueArchiveItems];
  mainData.source = 'launchbar';
  mainData.edited = now;

  File.writeJSON(mainData, jsonFilePath);

  // Remove the archive file after successful restore
  LaunchBar.execute('/bin/rm', archiveFilePath);

  LaunchBar.displayNotification({
    title: 'Later Action',
    string: `${uniqueArchiveItems.length} items moved from archive to main list!`,
  });

  return run();
}

// MARK: - iCloud Conflicts

function resolveICloudConflicts() {
  LaunchBar.hide();
  const status = File.exists('./resolveConflicts')
    ? LaunchBar.execute('/bin/bash', './resolveConflicts', jsonFilePath)?.trim()
    : LaunchBar.execute(
        '/usr/bin/swift',
        './resolveConflicts.swift',
        jsonFilePath
      )?.trim();

  if (status === 'MERGED') {
    LaunchBar.displayNotification({
      title: 'Later Action',
      string: 'iCloud conflicts resolved and data merged successfully.',
    });
  } else if (status === 'NO_CONFLICTS') {
    LaunchBar.displayNotification({
      title: 'Later Action',
      string: 'No iCloud conflicts found.',
    });
  } else if (status === 'ERROR') {
    LaunchBar.displayNotification({
      title: 'Later Action',
      string: 'Error resolving iCloud conflicts. Please check manually.',
    });
  }
}

// MARK: - Backup & Restore

function createBackup(filePath, skipLimit = false) {
  if (!File.exists(filePath)) return;

  const now = new Date().toLocaleString('sv').replace(/[: ]/g, '-');
  const fileName = filePath.split('/').pop().split('.')[0];
  const backupPath = `${backupDir}/${fileName}_backup_${now}.json`;

  if (!File.exists(backupDir)) File.createDirectory(backupDir);

  const jsonData = File.readJSON(filePath);
  File.writeJSON(jsonData, backupPath);

  if (!skipLimit) applyBackupLimit();
}

function applyBackupLimit() {
  const backups = File.getDirectoryContents(backupDir).sort().reverse();
  const filesToRemove = backups
    .slice(maxBackups)
    .map((backup) => `${backupDir}/${backup}`);
  if (filesToRemove.length) {
    LaunchBar.execute('/bin/rm', ...filesToRemove);
  }
}

function showBackups() {
  const backups = File.getDirectoryContents(backupDir)
    .sort()
    .reverse()
    .map((file) => ({
      title: File.displayName(file),
      icon: 'restoreTemplate',
      subtitle:
        'Confirm to restore from this backup. Hold ⌘ to reveal in Finder.',
      alwaysShowsSubtitle: true,
      path: `${backupDir}/${file}`,
      action: 'restoreBackup',
      actionArgument: file,
    }));

  return backups;
}

function restoreBackup(backupFile) {
  const backupPath = `${backupDir}/${backupFile}`;

  if (!File.exists(backupPath)) {
    LaunchBar.alert('Error', 'Backup file not found!');
    return;
  }

  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.execute('/usr/bin/open', '-R', backupPath);
    return;
  }

  const date = backupFile.split('_backup_')[1].split('.json')[0];
  const response = LaunchBar.alert(
    'Confirm Restore',
    `Are you sure you want to restore the backup from ${date}? This will replace your current list with the backup's content.`,
    'Restore',
    'Cancel'
  );

  if (response !== 0) return;

  // Create safety backup without applying the limit
  createBackup(jsonFilePath, true);

  const backupData = File.readJSON(backupPath);
  File.writeJSON(backupData, jsonFilePath);

  applyBackupLimit();

  LaunchBar.displayNotification({
    title: 'Later Action',
    string: 'Backup restored successfully!',
  });

  return run();
}
