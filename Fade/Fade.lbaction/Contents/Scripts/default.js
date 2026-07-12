/*
Fade Action Script for LaunchBar
by Christian Bender (@ptujec)
2026-07-07

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

const excludedBrowsers = [
  'org.mozilla.firefox',
  'org.mozilla.firefoxdeveloperedition',
  'app.zen-browser.zen',
  'io.gitlab.librewolf-community',
  'net.waterfox.waterfox',
  'org.torproject.torbrowser',
  'one.ablaze.floorp',
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

function getInstalledAppsInfo() {
  return File.getDirectoryContents('/Applications/')
    .filter((item) => item.endsWith('.app'))
    .flatMap((item) => {
      const infoPlistPath = '/Applications/' + item + '/Contents/Info.plist';
      if (!File.exists(infoPlistPath)) return [];

      const infoPlist = File.readPlist(infoPlistPath);
      return [
        {
          id: infoPlist.CFBundleIdentifier,
          supportsWeb:
            infoPlist.NSUserActivityTypes?.includes(
              'NSUserActivityTypeBrowsingWeb',
            ) ?? false,
        },
      ];
    });
}

function addBrowsers(manual) {
  const customBrowsers = Action.preferences.customBrowsers ?? [];
  const dontCount = [
    ...webkitBrowsers,
    ...chromiumBrowsers,
    ...customBrowsers,
    ...excludedBrowsers,
  ];

  const installedAppsInfo = getInstalledAppsInfo();
  const newlyAddedBrowsers = installedAppsInfo
    .filter((app) => app.supportsWeb && !dontCount.includes(app.id))
    .map((app) => app.id);

  const allBrowsers = [...customBrowsers, ...newlyAddedBrowsers];
  Action.preferences.customBrowsers = allBrowsers;

  if (!manual) return;

  const allBrowserIDs = [
    ...webkitBrowsers,
    ...chromiumBrowsers,
    ...allBrowsers,
  ];

  const installedBrowsers = [
    'com.apple.Safari',
    ...installedAppsInfo
      .filter((app) => allBrowserIDs.includes(app.id))
      .map((app) => app.id),
  ];

  const generalNote =
    'NOTE: For browser support to work, you need to allow JavaScript for Apple Events in each browser. It is turned OFF by default. To turn it on in Safari, go to Settings ‣ Developer ‣ Automation. In Chromium browsers, you can find the option in the View ‣ Developer menu.\n\nGecko-based browsers like Firefox and Zen are not supported.\n\nIf you add a browser that is WebKit-based, I may need to add its bundle ID in default.js to work properly. Let me know.';

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
