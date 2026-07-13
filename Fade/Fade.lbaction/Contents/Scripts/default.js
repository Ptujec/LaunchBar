/*
Fade Action Script for LaunchBar
by Christian Bender (@ptujec)
2026-07-13

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const webkitBrowsers = [
  'com.apple.Safari',
  'com.apple.SafariTechnologyPreview',
  'com.sigmaos.SigmaOS',
  'com.kagi.kagimacOS',
];

const chromiumBrowsers = [
  'org.chromium.Chromium',
  'com.google.Chrome',
  'com.brave.Browser',
  'com.vivaldi.Vivaldi',
  'net.imput.helium',
];

function run() {
  if (LaunchBar.options.alternateKey) return addBrowsers((manual = true));

  const add = appFolderModified();
  if (add) addBrowsers((manual = false));

  const supportedApps = [
    ...webkitBrowsers,
    ...chromiumBrowsers,
    ...(Action.preferences.customBrowsers || []),
    'com.apple.Music',
  ];

  const tabURL = Action.preferences.tabURL || '';
  const app = LaunchBar.options.commandKey
    ? 'com.apple.Music'
    : Action.preferences.recentApp || '';

  const lines = LaunchBar.execute(
    '/bin/bash',
    './appInfo.sh',
    supportedApps.join('\n'),
  )
    .trim()
    ?.split('\n');

  if (!lines) return;

  const runningApps = lines
    .map((line) => {
      const match = line.match(/"CFBundleIdentifier"="([^"]+)"/);
      return match ? match[1] : undefined;
    })
    .filter(Boolean);

  if (runningApps.length === 0) return;

  LaunchBar.log(
    '\nSupported apps:\n' + supportedApps.join('\n'),
    '\n\nRunning apps:\n' + runningApps.join('\n'),
  );

  LaunchBar.hide();

  const musicIsRunning = runningApps.includes('com.apple.Music');
  const runningBrowsers = runningApps
    .filter((id) => id !== 'com.apple.Music')
    ?.join('\n');

  const result = LaunchBar.executeAppleScriptFile(
    './fade.applescript',
    musicIsRunning,
    tabURL,
    app,
    runningBrowsers,
    webkitBrowsers.join('\n'),
  )
    ?.trim()
    ?.split('\n');

  Action.preferences.tabURL = result?.length > 1 ? result[0] : '';
  Action.preferences.recentApp =
    result?.length > 1 ? result[1] : result[0] || '';
}

// MARK: - Browser Detection

function hasSdefFile(appPath) {
  const resourcesPath = appPath + '/Contents/Resources';
  if (!File.exists(resourcesPath)) return false;

  const files = File.getDirectoryContents(resourcesPath);
  return files.some((file) => file.endsWith('.sdef'));
}

function getInstalledAppsInfo() {
  return File.getDirectoryContents('/Applications/')
    .filter((item) => item.endsWith('.app'))
    .flatMap((item) => {
      const appPath = '/Applications/' + item;
      const infoPlistPath = appPath + '/Contents/Info.plist';
      if (!File.exists(infoPlistPath)) return [];

      const infoPlist = File.readPlist(infoPlistPath);
      return [
        {
          id: infoPlist.CFBundleIdentifier,
          supportsWeb:
            infoPlist.NSUserActivityTypes?.includes(
              'NSUserActivityTypeBrowsingWeb',
            ) ?? false,
          hasSdef: hasSdefFile(appPath),
        },
      ];
    });
}

function addBrowsers(manual) {
  const customBrowsers = Action.preferences.customBrowsers ?? [];
  const dontCount = [...webkitBrowsers, ...chromiumBrowsers, ...customBrowsers];

  const installedAppsInfo = getInstalledAppsInfo();
  const newlyAddedBrowsers = installedAppsInfo
    .filter(
      (app) => app.supportsWeb && app.hasSdef && !dontCount.includes(app.id),
    )
    .map((app) => app.id);

  const updatedCustomBrowsers = [...customBrowsers, ...newlyAddedBrowsers];
  Action.preferences.customBrowsers = updatedCustomBrowsers;

  if (!manual) return;

  const supportedBrowserIDs = [
    ...webkitBrowsers,
    ...chromiumBrowsers,
    ...updatedCustomBrowsers,
  ];

  const installedBrowsers = [
    'com.apple.Safari',
    ...installedAppsInfo
      .filter((app) => supportedBrowserIDs.includes(app.id))
      .map((app) => app.id),
  ];

  const generalNote =
    'NOTE: For browser support to work, you need to allow JavaScript for Apple Events in each browser. It is turned OFF by default. To turn it on in Safari, go to Settings ‣ Developer ‣ Automation. In Chromium browsers, you can usually find the option in the View ‣ Developer menu.\n\nBrowsers without scripting support (like Firefox and Gecko-based browsers) are automatically excluded based on the presence of a .sdef file in their app bundle.';

  const title =
    newlyAddedBrowsers.length === 0
      ? 'No new browsers found.'
      : `Added ${newlyAddedBrowsers.length} browser(s):`;

  const subtitle =
    (newlyAddedBrowsers.length === 0
      ? `This action supports the following installed browsers (bundle IDs):\n\n${installedBrowsers.join('\n')}`
      : newlyAddedBrowsers.join('\n')) +
    '\n\n' +
    generalNote;

  LaunchBar.alert(title, subtitle);
}

// MARK: - App Folder Checking

function appFolderModified() {
  const currentModificationDate = File.modificationDate('/Applications');

  const appFolderLastModificationDate =
    Action.preferences.appFolderLastModificationDate;

  Action.preferences.appFolderLastModificationDate = currentModificationDate;

  if (!appFolderLastModificationDate) return true;

  return (
    appFolderLastModificationDate.toLocaleString() !==
    currentModificationDate.toLocaleString()
  );
}
