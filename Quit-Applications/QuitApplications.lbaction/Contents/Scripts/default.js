/* 
Quit Applications (by Context) Action for LaunchBar
by Christian Bender (@ptujec)
2022-04-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

const textFilePath = Action.supportPath + '/contexts.txt';

function run() {
  var firstrun = Action.preferences.firstrun;

  if (firstrun == undefined || !File.exists(textFilePath)) {
    LaunchBar.hide();
    Action.preferences.firstrun = false;
    var text = File.readText(Action.path + '/Contents/Resources/contexts.txt');
    File.writeText(text, textFilePath);
    LaunchBar.openURL(File.fileURLForPath(textFilePath));
  } else if (LaunchBar.options.shiftKey) {
    LaunchBar.hide();
    LaunchBar.openURL(File.fileURLForPath(textFilePath));
  } else {
    // Show Contexts
    var names = File.readText(textFilePath).split('\n');
    var result = [];
    names.forEach(function (item) {
      if (!item.startsWith('--') && item != '') {
        var contextTitle = item.split(':')[0];
        var icon = item.split(':')[1];
        if (icon == undefined) {
          icon = 'iconTemplate';
        } else {
          icon = icon.trim();
        }
        result.push({
          title: contextTitle.localize(),
          subtitle:
            'Quits applications not in "'.localize() +
            contextTitle.localize() +
            '". (Edit: ⇧⏎)'.localize(),
          icon: icon,
          action: 'main',
          actionArgument: contextTitle,
        });
      }
    });
    return result;
  }
}

function main(contextTitle) {
  var contextJSONFile = Action.supportPath + '/' + contextTitle + '.json';
  Action.preferences.contextJSONFile = contextJSONFile;

  if (LaunchBar.options.shiftKey || !File.exists(contextJSONFile)) {
    // Edit … when holding shift … or if context does not exist in preferences

    if (!File.exists(contextJSONFile)) {
      // Create
      var data = {
        title: contextTitle,
        apps: [],
      };
      File.writeJSON(data, contextJSONFile);
    }
    // Modifiy
    var output = showOptions();
    return output;
  } else {
    // Launch
    var contextJSON = File.readJSON(contextJSONFile);
    var showAlert = contextJSON.showAlert;
    var apps = contextJSON.apps;

    var exclusions = ['com.apple.finder', 'at.obdev.LaunchBar'];

    apps.forEach(function (item) {
      exclusions.push(item.id);
    });

    if (showAlert == true || showAlert == undefined) {
      alert(exclusions);
    } else {
      quitApplications(exclusions);
    }
  }
}

function showOptions() {
  var contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  var contextTitle = contextJSON.title;
  var showAlert = contextJSON.showAlert;
  var keepCurrent = contextJSON.keepCurrent;

  // Alert
  var alert = [
    {
      title: 'Show Alert'.localize(),
      subtitle: 'Show alert before quitting.'.localize(),
      action: 'toggleAlert',
      icon: 'alertTemplate',
    },
  ];

  if (showAlert == true || showAlert == undefined) {
    // alert[0].label = '✔︎';
    alert[0].label = contextTitle.localize() + ': ✔︎';
  }

  // Currently Frontmost Application
  var current = [
    {
      title: 'Frontmost Application'.localize(),
      subtitle: "Don't quit the frontmost application.".localize(),
      action: 'toggleCurrent',
      icon: 'currentTemplate',
    },
  ];

  if (keepCurrent == true || keepCurrent == undefined) {
    current[0].label = contextTitle.localize() + ': ✔︎';
  }

  // Finder Windows
  var closeFinderWindowsOption = contextJSON.closeFinderWindowsOption;

  var finderWindows = [
    {
      title: 'Finder Windows'.localize(),
      subtitle: 'Close Finder Windows.'.localize(),
      action: 'toggleCloseFinderWindows',
      // icon: 'com.apple.finder',
      icon: 'windowStackTemplate',
    },
  ];

  if (closeFinderWindowsOption == true) {
    finderWindows[0].label = contextTitle.localize() + ': ✔︎';
  }

  // Add Applications manually
  var addApp = [
    {
      title: 'Add Unlisted Application'.localize(),
      subtitle: 'Add application missing in this list.'.localize(),
      icon: 'addTemplate',
      action: 'addApplication',
      actionRunsInBackground: true,
    },
  ];

  // Excluded Applications
  var apps = contextJSON.apps;

  var resultEx = [];
  var exList = [];

  if (apps != undefined) {
    apps.forEach(function (item) {
      var title = File.displayName(item.path).replace('.app', '');
      resultEx.push({
        title: title,
        subtitle: title + ' will keep running'.localize(),
        path: item.path,
        icon: item.id,
        action: 'toggleExclude',
        actionArgument: item.path,
        label: contextTitle.localize() + ': ✔︎',
      });
      exList.push(item.path);
    });

    resultEx.sort(function (a, b) {
      return a.title > b.title;
    });
  }

  // Other Applications
  var result = [];

  // Manually Added Applications
  var customApps = Action.preferences.customApps;

  if (customApps != undefined) {
    customApps.forEach(function (item) {
      var path = item;
      var title = File.displayName(path).replace('.app', '');
      var infoPlistPath = path + '/Contents/Info.plist';
      var infoPlist = File.readPlist(infoPlistPath);
      var appID = infoPlist.CFBundleIdentifier;

      if (!exList.includes(path)) {
        result.push({
          title: title,
          path: path,
          icon: appID,
          action: 'toggleExclude',
          actionArgument: path,
        });
      }
    });
  }

  // System Applications
  var sysAppsPath = '/System/Applications/';
  var sysApps = File.getDirectoryContents(sysAppsPath);

  sysApps.forEach(function (item) {
    if (item.endsWith('.app')) {
      var path = sysAppsPath + item;
      var title = File.displayName(path).replace('.app', '');

      var infoPlistPath = path + '/Contents/Info.plist';
      var infoPlist = File.readPlist(infoPlistPath);

      var agentApp = infoPlist.LSUIElement;
      // var appType = infoPlist.LSApplicationCategoryType;
      var appID = infoPlist.CFBundleIdentifier;

      if (
        !exList.includes(path) &&
        title != 'LaunchBar' &&
        // appType != 'public.app-category.utilities' &&
        agentApp != true
      ) {
        result.push({
          title: title,
          path: path,
          icon: appID,
          action: 'toggleExclude',
          actionArgument: path,
        });
      }
    }
  });

  // Installed Applications
  var installedAppsPath = '/Applications/';
  var installedApps = File.getDirectoryContents(installedAppsPath);

  installedApps.forEach(function (item) {
    if (item.endsWith('.app')) {
      var path = installedAppsPath + item;
      var title = File.displayName(path).replace('.app', '');

      var infoPlistPath = path + '/Contents/Info.plist';

      if (!File.exists(infoPlistPath)) {
        var wrapper = path + '/Wrapper/'; // iOS Apps on Macs with Apple Silicon should have that

        if (File.exists(wrapper)) {
          var contents = File.getDirectoryContents(wrapper);
          contents.forEach(function (item) {
            if (item.endsWith('.app')) {
              // LaunchBar.alert(item);
              infoPlistPath = path + '/Wrapper/' + item + '/Info.plist';
            }
          });
        }
      }

      if (File.exists(infoPlistPath)) {
        var infoPlist = File.readPlist(infoPlistPath);

        var agentApp = infoPlist.LSUIElement;
        // var appType = infoPlist.LSApplicationCategoryType;
        var appID = infoPlist.CFBundleIdentifier;

        if (
          !exList.includes(path) &&
          title != 'LaunchBar' &&
          // appType != 'public.app-category.utilities' &&
          agentApp != true
        ) {
          result.push({
            title: title,
            path: path,
            icon: appID,
            action: 'toggleExclude',
            actionArgument: path,
          });
        }
      }
    }
  });

  // Utility Applications
  var utilityAppsPath = '/System/Applications/Utilities/';
  var utilityApps = File.getDirectoryContents(utilityAppsPath);

  utilityApps.forEach(function (item) {
    if (item.endsWith('.app')) {
      var path = utilityAppsPath + item;
      var title = File.displayName(path).replace('.app', '');

      var infoPlistPath = path + '/Contents/Info.plist';

      var infoPlist = File.readPlist(infoPlistPath);

      var agentApp = infoPlist.LSUIElement;
      var appID = infoPlist.CFBundleIdentifier;

      if (!exList.includes(path) && title != 'LaunchBar' && agentApp != true) {
        result.push({
          title: title,
          path: path,
          icon: appID,
          action: 'toggleExclude',
          actionArgument: path,
        });
      }
    }
  });

  result.sort(function (a, b) {
    return a.title > b.title;
  });

  var resultAll = alert.concat(
    current.concat(finderWindows.concat(addApp.concat(resultEx.concat(result))))
  );

  return resultAll;
}

function toggleAlert() {
  var contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  var showAlert = contextJSON.showAlert;

  if (showAlert == true || showAlert == undefined) {
    contextJSON.showAlert = false;
  } else {
    contextJSON.showAlert = true;
  }

  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);

  var output = showOptions();
  return output;
}

function toggleCurrent() {
  var contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  var keepCurrent = contextJSON.keepCurrent;

  if (keepCurrent == true || keepCurrent == undefined) {
    contextJSON.keepCurrent = false;
  } else {
    contextJSON.keepCurrent = true;
  }

  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);

  var output = showOptions();
  return output;
}

function toggleCloseFinderWindows(path) {
  var contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  var closeFinderWindowsOption = contextJSON.closeFinderWindowsOption;

  if (closeFinderWindowsOption == true) {
    contextJSON.closeFinderWindowsOption = false;
  } else {
    contextJSON.closeFinderWindowsOption = true;
  }

  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);

  var output = showOptions();
  return output;
}

function toggleExclude(path) {
  var contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  var apps = contextJSON.apps;

  var excludeID = LaunchBar.executeAppleScript(
    'set appID to bundle identifier of (info for ("' + path + '"))'
  ).trim();

  var exclude = {
    path: path,
    id: excludeID,
  };

  for (var i = 0; i < apps.length; i++) {
    if (apps[i].id == exclude.id) {
      contextJSON.apps.splice(i, 1);
      var broke = true;
      break;
    }
  }
  if (broke != true) {
    contextJSON.apps.push(exclude);
  }

  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);

  var output = showOptions();
  return output;
}

function alert(exclusions) {
  var contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  var keepCurrent = contextJSON.keepCurrent;

  var closeFinderWindowsOption = contextJSON.closeFinderWindowsOption;
  if (closeFinderWindowsOption == undefined) {
    closeFinderWindowsOption = false;
  }

  var allAppsAS =
    'tell application "System Events" \n' +
    '  set allApps to bundle identifier of (every process whose background only is false) as list \n';

  var countWindowsAS =
    '  tell application process "Finder" to set windowCount to count windows\n';

  var currentAppAS =
    '  set currentApp to bundle identifier of (process 1 where frontmost is true)\n';

  var endTellSysEventsAS = 'end tell\n';

  var exclusionsAS = 'set exclusions to "' + exclusions + '"\n';

  var exclusionsPlusCurrentAS = 'set exclusions to exclusions & currentApp \n';

  var toQuitAS =
    'set toQuit to {}\n' +
    'repeat with thisApp in allApps\n' +
    '  set thisApp to thisApp as text\n' +
    '  if thisApp is not in exclusions then\n' +
    '     set end of toQuit to name of application id thisApp\n' +
    '  end if\n' +
    'end repeat\n';

  var returnAS = 'return toQuit';

  if (closeFinderWindowsOption == true) {
    allAppsAS = allAppsAS + countWindowsAS;
    returnAS = returnAS + ' & windowCount';
  }

  if (keepCurrent == true || keepCurrent == undefined) {
    var appleScript =
      allAppsAS +
      currentAppAS +
      endTellSysEventsAS +
      exclusionsAS +
      exclusionsPlusCurrentAS +
      toQuitAS +
      returnAS;
  } else {
    var appleScript =
      allAppsAS + endTellSysEventsAS + exclusionsAS + toQuitAS + returnAS;
  }

  var appleScriptResult = LaunchBar.executeAppleScript(appleScript)
    .trim()
    .split(', ');

  var lastItem = appleScriptResult[appleScriptResult.length - 1];

  if (isNaN(lastItem) == false) {
    // Last time IS a number (-> Finder Windows)
    var toClose = appleScriptResult.pop();
    var toQuit = appleScriptResult.join(', ');
  } else {
    var toQuit = appleScriptResult.join(', ');
  }

  if (toQuit != '' || closeFinderWindowsOption == true) {
    if (closeFinderWindowsOption == true && toQuit != '') {
      if (toClose > 0) {
        var dialog =
          'Quit '.localize() +
          toQuit +
          ' and close '.localize() +
          toClose +
          ' Finder windows.'.localize();
      } else {
        var dialog = toQuit;
      }
    } else if (closeFinderWindowsOption == false && toQuit != '') {
      var dialog = toQuit;
    } else {
      if (toClose > 0) {
        var dialog =
          'Close '.localize() + toClose + ' Finder Window(s).'.localize();
      } else {
        LaunchBar.alert(
          'No Application to hide, no window to close.'.localize()
        );
        return;
      }
    }

    var response = LaunchBar.alert(
      'Quit Applications'.localize(),
      dialog,
      'Ok',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.hide();
        quitApplications(exclusions);
      case 1:
        // LaunchBar.hide();
        break;
    }
  } else {
    if (closeFinderWindowsOption == false) {
      LaunchBar.alert('No Application to hide.'.localize());
    } else {
      LaunchBar.alert('No Application to hide, no window to close.'.localize());
    }
  }
}

function quitApplications(exclusions) {
  LaunchBar.hide();

  var contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  var closeFinderWindowsOption = contextJSON.closeFinderWindowsOption;
  var keepCurrent = contextJSON.keepCurrent;

  var closeFinderWindowsAS =
    'tell application "Finder"\n' +
    ' activate\n' +
    ' close every window\n' +
    'end tell\n' +
    'tell application "System Events" to set visible of application process "Finder" to false\n';

  var allAppsAS =
    'tell application "System Events" \n' +
    '  set allApps to bundle identifier of (every process whose background only is false) as list \n';

  var currentAppAS =
    '  set currentApp to bundle identifier of (process 1 where frontmost is true)\n';

  var endTellSysEventsAS = 'end tell\n';

  var exclusionsAS = 'set exclusions to "' + exclusions + '"\n';

  var exclusionsPlusCurrentAS = 'set exclusions to exclusions & currentApp \n';

  var quitAS =
    'repeat with thisApp in allApps\n' +
    '  set thisApp to thisApp as text\n' +
    '  if thisApp is not in exclusions then\n' +
    '    tell application id thisApp\n' +
    '      activate\n' +
    '      quit\n' +
    '    end tell\n' +
    '  end if\n' +
    'end repeat';

  if (keepCurrent == true || keepCurrent == undefined) {
    var appleScript =
      allAppsAS +
      currentAppAS +
      endTellSysEventsAS +
      exclusionsAS +
      exclusionsPlusCurrentAS +
      quitAS;
  } else {
    var appleScript = allAppsAS + endTellSysEventsAS + exclusionsAS + quitAS;
  }

  if (closeFinderWindowsOption == true) {
    appleScript = closeFinderWindowsAS + appleScript;
  }

  LaunchBar.executeAppleScript(appleScript);
}

function addApplication() {
  LaunchBar.hide();
  var customApp = LaunchBar.executeAppleScript(
    'tell application "Finder"',
    '   activate',
    '   set _default to "Applications:" as alias',
    '   set _app to choose file default location _default',
    '   set _app to POSIX path of _app',
    'end tell'
  )
    .trim()
    .replace(/\/$/, '');

  if (customApp == '') {
    return;
  }

  var customApps = Action.preferences.customApps;

  if (customApps == undefined) {
    var customApps = [];
    customApps.push(customApp);
    Action.preferences.customApps = customApps;
  } else {
    if (!customApps.includes(customApp)) {
      customApps.push(customApp);
    }
  }

  var output = showOptions();
  return output;
}
