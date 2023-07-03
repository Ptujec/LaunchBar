/* 
Quit Applications (by Context) Action for LaunchBar
by Christian Bender (@ptujec)
2022-04-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

const textFilePath = Action.supportPath + '/contexts.txt';

function run() {
  const firstrun = Action.preferences.firstrun;

  // Add Safari Location on Ventura and above
  if (parseInt(LaunchBar.systemVersion) > 12) {
    const safariLocation =
      '/System/Volumes/Preboot/Cryptexes/App/System/Applications/Safari.app';
    let customApps = Action.preferences.customApps || [];
    if (!customApps.includes(safariLocation)) customApps.push(safariLocation);
    Action.preferences.customApps = customApps;
  }

  if (firstrun == undefined || !File.exists(textFilePath)) {
    LaunchBar.hide();
    Action.preferences.firstrun = false;
    const text = File.readText(
      Action.path + '/Contents/Resources/contexts.txt'
    );
    File.writeText(text, textFilePath);
    LaunchBar.openURL(File.fileURLForPath(textFilePath), 'BBEdit');
    return;
  }

  if (LaunchBar.options.alternateKey) {
    LaunchBar.hide();
    LaunchBar.openURL(File.fileURLForPath(textFilePath), 'BBEdit');
    return;
  }

  // Show Contexts
  const names = File.readText(textFilePath).split('\n');
  return names
    .filter((item) => !item.startsWith('--') && item)
    .map((item) => {
      let [contextTitle, icon] = item.split(':');
      icon = icon ? icon.trim() : 'iconTemplate';

      return {
        title: contextTitle.localize(),
        subtitle:
          'Quits applications not in "'.localize() +
          contextTitle.localize() +
          '". (Edit: ⌥ ⏎)'.localize(),
        icon,
        action: 'main',
        actionArgument: contextTitle,
        alwaysShowsSubtitle: true,
      };
    });
}

function main(contextTitle) {
  const contextJSONFile = `${Action.supportPath}/${contextTitle}.json`;

  Action.preferences.contextJSONFile = contextJSONFile;

  if (LaunchBar.options.alternateKey || !File.exists(contextJSONFile)) {
    // Edit … when holding alternate … or if context does not exist in preferences

    if (!File.exists(contextJSONFile)) {
      // Create
      const data = {
        title: contextTitle,
        apps: [],
      };
      File.writeJSON(data, contextJSONFile);
    }
    // Modifiy
    return showOptions();
  }

  // Launch
  const contextJSON = File.readJSON(contextJSONFile);
  const showAlert = contextJSON.showAlert;
  const apps = contextJSON.apps;

  const exclusions = ['com.apple.finder', 'at.obdev.LaunchBar'];

  for (const item of apps) {
    exclusions.push(item.id);
  }

  if (showAlert == true || showAlert == undefined) {
    alert(exclusions);
  } else {
    quitApplications(exclusions);
  }
}

function showOptions() {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const contextTitle = contextJSON.title;
  const showAlert = contextJSON.showAlert;
  const keepCurrent = contextJSON.keepCurrent;
  const activate = contextJSON.activate;
  const keepFinderWindowsOption = contextJSON.keepFinderWindowsOption;

  // Alert
  const alert = [
    {
      title: 'Show Alert'.localize(),
      subtitle: 'Show alert before quitting.'.localize(),
      action: 'toggleAlert',
      icon: 'alertTemplate',
      alwaysShowsSubtitle: true,
    },
  ];

  if (showAlert == true || showAlert == undefined)
    alert[0].label = contextTitle.localize() + ': ✔︎';

  // Activate Applications
  const activateOption = [
    {
      title: 'Activate Application'.localize(),
      subtitle: 'Activate Appliction before closing.'.localize(),
      action: 'toggleActivate',
      icon: 'activateTemplate',
      alwaysShowsSubtitle: true,
    },
  ];

  if (activate == true)
    activateOption[0].label = contextTitle.localize() + ': ✔︎';

  // Currently Frontmost Application
  const current = [
    {
      title: 'Frontmost Application'.localize(),
      subtitle: "Don't quit the frontmost application.".localize(),
      action: 'toggleCurrent',
      icon: 'currentTemplate',
      alwaysShowsSubtitle: true,
    },
  ];

  if (keepCurrent == true || keepCurrent == undefined)
    current[0].label = contextTitle.localize() + ': ✔︎';

  // Finder Windows
  const finderWindows = [
    {
      title: 'Finder Windows'.localize(),
      subtitle: 'Keep Finder Windows.'.localize(),
      action: 'toggleKeepFinderWindows',
      icon: 'windowStackTemplate',
      alwaysShowsSubtitle: true,
    },
  ];

  if (keepFinderWindowsOption == true || keepFinderWindowsOption == undefined)
    finderWindows[0].label = contextTitle.localize() + ': ✔︎';

  // Add Applications manually
  const addApp = [
    {
      title: 'Add Unlisted Application'.localize(),
      subtitle: 'Add application missing in this list.'.localize(),
      icon: 'addTemplate',
      action: 'addApplication',
      alwaysShowsSubtitle: true,
      actionRunsInBackground: true,
    },
  ];

  // Excluded Applications
  let excludedApps = [];
  let exList = [];
  let contextApps = contextJSON.apps || [];

  contextJSON.apps = contextApps.filter((item) => {
    if (!File.exists(item.path)) {
      // remove deleted apps from the list
      return false;
    }
    const title = File.displayName(item.path).replace('.app', '');
    excludedApps.push({
      title,
      subtitle: title + ' will keep running'.localize(),
      path: item.path,
      icon: item.id,
      action: 'toggleExclude',
      actionArgument: item.path,
      label: contextTitle.localize() + ': ✔︎',
      alwaysShowsSubtitle: true,
    });
    exList.push(item.path);
    return true;
  });

  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);

  excludedApps.sort((a, b) => a.title > b.title);

  // Included Applications
  let includedApps = [];

  // Manually Added Applications
  let customApps = Action.preferences.customApps || [];

  Action.preferences.customApps = customApps.filter((item, index) => {
    const path = item;
    const title = File.displayName(path).replace('.app', '');
    const infoPlistPath = `${path}/Contents/Info.plist`;
    if (!File.exists(infoPlistPath)) return false; // remove deleted apps from the list

    const infoPlist = File.readPlist(infoPlistPath);
    const appID = infoPlist.CFBundleIdentifier;

    if (!exList.includes(path)) {
      includedApps.push({
        title,
        path,
        icon: appID,
        action: 'toggleExclude',
        actionArgument: path,
      });
    }

    return true;
  });

  // System Applications
  const sysAppsPath = '/System/Applications/';
  const sysApps = File.getDirectoryContents(sysAppsPath);
  includedApps = getApplications(sysAppsPath, sysApps, includedApps, exList);

  // Installed Applications
  const installedAppsPath = '/Applications/';
  const installedApps = File.getDirectoryContents(installedAppsPath);
  includedApps = getApplications(
    installedAppsPath,
    installedApps,
    includedApps,
    exList
  );

  // Utility Applications
  const utilityAppsPath = '/System/Applications/Utilities/';
  const utilityApps = File.getDirectoryContents(utilityAppsPath);

  includedApps = getApplications(
    utilityAppsPath,
    utilityApps,
    includedApps,
    exList
  );

  includedApps.sort((a, b) => a.title > b.title);

  return [
    ...alert,
    ...activateOption,
    ...current,
    ...finderWindows,
    ...addApp,
    ...excludedApps,
    ...includedApps,
  ];
}

function getApplications(appsPath, apps, includedApps, exList) {
  for (const item of apps) {
    if (item.endsWith('.app')) {
      const path = appsPath + item;
      const title = File.displayName(path).replace('.app', '');
      let infoPlistPath = path + '/Contents/Info.plist';

      if (!File.exists(infoPlistPath)) {
        const wrapper = path + '/Wrapper/'; // iOS Apps on Macs with Apple Silicon should have that

        if (File.exists(wrapper)) {
          const contents = File.getDirectoryContents(wrapper);

          for (const item of contents)
            if (item.endsWith('.app'))
              infoPlistPath = path + '/Wrapper/' + item + '/Info.plist';
        }
      } else {
        const infoPlist = File.readPlist(infoPlistPath);
        const agentApp = infoPlist.LSUIElement;
        const appID = infoPlist.CFBundleIdentifier;

        if (
          !exList.includes(path) &&
          title != 'LaunchBar' &&
          agentApp != true
        ) {
          includedApps.push({
            title,
            path,
            icon: appID,
            action: 'toggleExclude',
            actionArgument: path,
          });
        }
      }
    }
  }
  return includedApps;
}

function toggleAlert() {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const showAlert = contextJSON.showAlert;

  contextJSON.showAlert =
    showAlert == true || showAlert == undefined ? false : true;

  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);
  return showOptions();
}

function toggleCurrent() {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const keepCurrent = contextJSON.keepCurrent;

  contextJSON.keepCurrent =
    keepCurrent == true || keepCurrent == undefined ? false : true;

  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);
  return showOptions();
}

function toggleActivate(path) {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const activate = contextJSON.activate;

  contextJSON.activate = activate == true ? false : true;

  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);
  return showOptions();
}

function toggleKeepFinderWindows(path) {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const keepFinderWindowsOption = contextJSON.keepFinderWindowsOption;

  contextJSON.keepFinderWindowsOption =
    keepFinderWindowsOption == false ? true : false;

  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);
  return showOptions();
}

function toggleExclude(path) {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const contextApps = contextJSON.apps;

  const excludeID = LaunchBar.executeAppleScript(
    'set appID to bundle identifier of (info for ("' + path + '"))'
  ).trim();

  const exclude = {
    path: path,
    id: excludeID,
  };

  const updatedApps = contextJSON.apps.filter((app) => app.id !== exclude.id);

  contextJSON.apps =
    updatedApps.length === contextJSON.apps.length
      ? [...updatedApps, exclude]
      : updatedApps;

  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);
  return showOptions();
}

function alert(exclusions) {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const keepCurrent = contextJSON.keepCurrent;
  const keepFinderWindowsOption =
    contextJSON.keepFinderWindowsOption == false ? false : true;

  let allAppsAS =
    'tell application "System Events" \n' +
    '  set allApps to bundle identifier of (every process whose background only is false) as list \n';

  const countWindowsAS =
    '  tell application process "Finder" to set windowCount to count windows\n';

  const currentAppAS =
    '  set currentApp to bundle identifier of (process 1 where frontmost is true)\n';

  const endTellSysEventsAS = 'end tell\n';

  const exclusionsAS = 'set exclusions to "' + exclusions + '"\n';

  const exclusionsPlusCurrentAS =
    'set exclusions to exclusions & currentApp \n';

  const toQuitAS =
    'set toQuit to {}\n' +
    'repeat with thisApp in allApps\n' +
    '  set thisApp to thisApp as text\n' +
    '  if thisApp is not in exclusions then\n' +
    '     set end of toQuit to name of application id thisApp\n' +
    '  end if\n' +
    'end repeat\n';

  let returnAS = 'return toQuit';

  if (keepFinderWindowsOption == false) {
    allAppsAS = allAppsAS + countWindowsAS;
    returnAS = returnAS + ' & windowCount';
  }

  let appleScript;

  if (
    keepCurrent == true ||
    keepCurrent == undefined ||
    LaunchBar.options.commandKey
  ) {
    appleScript =
      allAppsAS +
      currentAppAS +
      endTellSysEventsAS +
      exclusionsAS +
      exclusionsPlusCurrentAS +
      toQuitAS +
      returnAS;
  } else {
    appleScript =
      allAppsAS + endTellSysEventsAS + exclusionsAS + toQuitAS + returnAS;
  }

  const appleScriptResult = LaunchBar.executeAppleScript(appleScript)
    .trim()
    .split(', ');

  const lastItem = appleScriptResult[appleScriptResult.length - 1];

  let toClose, toQuit, dialog;

  if (isNaN(lastItem) == false) {
    // Last time IS a number (-> Finder Windows)
    toClose = appleScriptResult.pop();
    toQuit = appleScriptResult.join(', ');
  } else {
    toQuit = appleScriptResult.join(', ');
  }

  if (toQuit || keepFinderWindowsOption == false) {
    if (keepFinderWindowsOption == false && toQuit) {
      if (toClose > 0) {
        dialog =
          'Quit '.localize() +
          toQuit +
          ' and close '.localize() +
          toClose +
          ' Finder windows.'.localize();
      } else {
        dialog = toQuit;
      }
    } else if (keepFinderWindowsOption == true && toQuit) {
      dialog = toQuit;
    } else {
      if (toClose > 0) {
        dialog =
          'Close '.localize() + toClose + ' Finder Window(s).'.localize();
      } else {
        LaunchBar.alert(
          'No Application to hide, no window to close.'.localize()
        );
        LaunchBar.hide();
        return;
      }
    }

    const response = LaunchBar.alert(
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
        break;
    }
    return;
  }

  if (keepFinderWindowsOption == true) {
    LaunchBar.alert('No Application to hide.'.localize());
    LaunchBar.hide();
    return;
  } else {
    LaunchBar.alert('No Application to hide, no window to close.'.localize());
    LaunchBar.hide();
    return;
  }
}

function quitApplications(exclusions) {
  LaunchBar.hide();

  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const keepFinderWindowsOption = contextJSON.keepFinderWindowsOption;
  const keepCurrent = contextJSON.keepCurrent;
  const activate = contextJSON.activate;

  const closeFinderWindowsAS =
    'tell application "Finder"\n' +
    ' activate\n' +
    ' close every window\n' +
    'end tell\n' +
    'tell application "System Events" to set visible of application process "Finder" to false\n';

  const allAppsAS =
    'tell application "System Events" \n' +
    '  set allApps to bundle identifier of (every process whose background only is false) as list \n';

  const currentAppAS =
    '  set currentApp to bundle identifier of (process 1 where frontmost is true)\n';

  const endTellSysEventsAS = 'end tell\n';

  const exclusionsAS = 'set exclusions to "' + exclusions + '"\n';

  const exclusionsPlusCurrentAS =
    'set exclusions to exclusions & currentApp \n';

  let quitAS, appleScript;

  if (activate == true) {
    quitAS =
      'repeat with thisApp in allApps\n' +
      '  set thisApp to thisApp as text\n' +
      '  if thisApp is not in exclusions then\n' +
      '    tell application id thisApp\n' +
      '      activate\n' +
      '      quit\n' +
      '    end tell\n' +
      '  end if\n' +
      'end repeat';
  } else {
    quitAS =
      'repeat with thisApp in allApps\n' +
      '  set thisApp to thisApp as text\n' +
      '  if thisApp is not in exclusions then\n' +
      '    tell application id thisApp\n' +
      '      quit\n' +
      '    end tell\n' +
      '  end if\n' +
      'end repeat';
  }

  if (
    keepCurrent == true ||
    keepCurrent == undefined ||
    LaunchBar.options.commandKey
  ) {
    appleScript =
      allAppsAS +
      currentAppAS +
      endTellSysEventsAS +
      exclusionsAS +
      exclusionsPlusCurrentAS +
      quitAS;
  } else {
    appleScript = allAppsAS + endTellSysEventsAS + exclusionsAS + quitAS;
  }

  if (keepFinderWindowsOption == false) {
    appleScript = closeFinderWindowsAS + appleScript;
  }

  LaunchBar.executeAppleScript(appleScript);
}

function addApplication() {
  LaunchBar.hide();
  let customApp = LaunchBar.executeAppleScript(
    'tell application "Finder"',
    '   activate',
    '   set _default to "Applications:" as alias',
    '   set _app to choose file default location _default',
    '   set _app to POSIX path of _app',
    'end tell'
  )
    .trim()
    .replace(/\/$/, '');

  if (customApp == '') return;

  const customApps = Action.preferences.customApps || [];
  if (!customApps.includes(customApp)) {
    customApps.push(customApp);
    Action.preferences.customApps = customApps;
  }

  return showOptions();
}
