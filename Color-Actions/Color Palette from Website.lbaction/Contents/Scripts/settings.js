function chooseBrowser() {
  // List all installed browser (from /Applications/ & Safari)

  var browser = Action.preferences.browser ?? getDefaultBrowser();

  var result = [
    {
      title: 'Safari',
      icon: 'com.apple.Safari',
      action: 'setBrowser',
      actionArgument: 'com.apple.Safari',
    },
  ];

  var installedApps = File.getDirectoryContents('/Applications/');
  installedApps.forEach(function (item) {
    if (item.endsWith('.app')) {
      var infoPlistPath = '/Applications/' + item + '/Contents/Info.plist';

      if (File.exists(infoPlistPath)) {
        var infoPlist = File.readPlist(infoPlistPath);
        var bundleName = infoPlist.CFBundleName;
        var appID = infoPlist.CFBundleIdentifier;
        var activityTypes = infoPlist.NSUserActivityTypes;

        if (activityTypes != undefined) {
          activityTypes.forEach(function (item) {
            if (item == 'NSUserActivityTypeBrowsingWeb') {
              result.push({
                title: bundleName,
                icon: appID,
                action: 'setBrowser',
                actionArgument: appID,
              });
            }
          });
        }
      }
    }
  });

  result.forEach(function (item) {
    if (item.actionArgument.toLowerCase() == browser.toLowerCase()) {
      item.label = 'Results open in ' + item.title; // + '  ✔';
    }
  });

  return result;
}

function getDefaultBrowser() {
  var plist = File.readPlist(
    '~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist'
  );

  var defaultBrowser = '';
  plist.LSHandlers.forEach(function (item) {
    if (item.LSHandlerURLScheme == 'http') {
      defaultBrowser = item.LSHandlerRoleAll.toLowerCase();
    }
  });

  return defaultBrowser;
}

function setBrowser(appID) {
  Action.preferences.browser = appID;
  return chooseBrowser();
}
