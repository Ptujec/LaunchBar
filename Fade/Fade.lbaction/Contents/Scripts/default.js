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
  if (LaunchBar.options.alternateKey) return addBrowsers();

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

function addBrowsers() {
  const excluded = [
    ...webkitBrowsers,
    ...chromiumBrowsers,
    ...(Action.preferences.customBrowsers ?? []),
    ...excludedBrowsers,
  ];

  let newlyAddedBrowsers = [];
  let allAddedBrowsers = [...(Action.preferences.customBrowsers ?? [])];

  const installedApps = File.getDirectoryContents('/Applications/');
  for (item of installedApps) {
    if (item.endsWith('.app')) {
      const infoPlistPath = '/Applications/' + item + '/Contents/Info.plist';

      if (File.exists(infoPlistPath)) {
        const infoPlist = File.readPlist(infoPlistPath);
        const bundleName = infoPlist.CFBundleName;
        const appID = infoPlist.CFBundleIdentifier;
        const activityTypes = infoPlist.NSUserActivityTypes;

        if (activityTypes && !excluded.includes(appID)) {
          for (item of activityTypes) {
            if (item == 'NSUserActivityTypeBrowsingWeb') {
              newlyAddedBrowsers.push(appID);
              allAddedBrowsers.push(appID);
            }
          }
        }
      }
    }
  }

  Action.preferences.customBrowsers = allAddedBrowsers;

  const generalNote =
    'Note: For browser support to work, you need to allow JavaScript for Apple Events. This is turned off by default. To turn it on in Safari, go to Settings ‣ Developer ‣ Automation. In Chromium browsers, you can find the option in the View ‣ Developer menu.\n\nGecko-based browsers like Firefox and Zen are not supported by this LaunchBar action.\n\nIf you add a browser that is WebKit-based, I may need to add its bundle ID in default.js to work properly. Let me know.';

  let title, subtitle;

  if (newlyAddedBrowsers.length === 0) {
    title =
      allAddedBrowsers.length > 0
        ? 'You added all available browsers:'
        : 'You added all available browsers.';
    subtitle =
      allAddedBrowsers.length > 0
        ? allAddedBrowsers.join('\n') + '\n\n' + generalNote
        : generalNote;
  } else {
    title = 'Added ' + newlyAddedBrowsers.length + ' browser(s):';
    subtitle = newlyAddedBrowsers.join('\n') + '\n\n' + generalNote;
  }

  LaunchBar.alert(title, subtitle);
  return { actionBundleIdentifier: Action.bundleIdentifier };
}
