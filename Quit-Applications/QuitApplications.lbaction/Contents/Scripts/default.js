/* 
Quit Applications (by Context) Action for LaunchBar
by Christian Bender (@ptujec)
2025-05-12

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

// MARK: - Constants

const textFilePath = `${Action.supportPath}/contexts.txt`;

const defaultApps = [
  '/System/Volumes/Preboot/Cryptexes/App/System/Applications/Safari.app',
  '/Applications/LaunchBar.app/Contents/Resources/Action Editor.app',
  '/Library/Application Support/Microsoft/MAU2.0/Microsoft AutoUpdate.app',
];

const defaultExclusions = ['com.apple.finder', 'at.obdev.LaunchBar'];

String.prototype.localizationTable = 'default';

// MARK: - Core Functions

function run() {
  const firstrun = Action.preferences.firstrun;

  const customApps = Action.preferences.customApps || [];
  const newApps = defaultApps.filter(
    (app) => File.exists(app) && !customApps.includes(app)
  );

  if (newApps.length > 0) {
    Action.preferences.customApps = [...customApps, ...newApps];
  }

  if (firstrun == undefined || !File.exists(textFilePath)) {
    LaunchBar.hide();
    Action.preferences.firstrun = false;
    const text = File.readText(
      `${Action.path}/Contents/Resources/contexts.txt`
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
      const contextTitle = item.split(':')[0].trim();
      const icon = item.split(':')[1].trim();

      return {
        title: contextTitle.localize(),
        subtitle:
          'Quits applications not in "'.localize() +
          contextTitle.localize() +
          '". (Edit: ⌥ ⏎)'.localize(),
        icon,
        action: 'handleQuitContext',
        actionArgument: contextTitle,
      };
    });
}

function handleQuitContext(contextTitle) {
  const contextJSONFile = `${Action.supportPath}/${contextTitle}.json`;

  Action.preferences.contextJSONFile = contextJSONFile;

  if (LaunchBar.options.alternateKey || !File.exists(contextJSONFile)) {
    if (!File.exists(contextJSONFile)) {
      const data = {
        title: contextTitle,
        apps: [],
      };
      File.writeJSON(data, contextJSONFile);
    }
    return showOptions();
  }

  const contextJSON = File.readJSON(contextJSONFile);
  const showAlert = contextJSON.showAlert;
  const apps = contextJSON.apps;

  const exclusions = [...defaultExclusions, ...apps.map((item) => item.id)];

  if (showAlert == undefined || showAlert == true) {
    showQuitConfirmationAlert(exclusions);
  } else {
    quitApplications(exclusions);
  }
}

// MARK: - UI and Options Management

function showOptions() {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const { showAlert, keepCurrent, keepFinderWindowsOption } = contextJSON;

  const menuItems = [
    {
      title: 'Confirmation'.localize(),
      action: 'toggleAlertOption',
      icon: 'alertTemplate',
      label:
        showAlert == true || showAlert == undefined
          ? 'showing'.localize()
          : 'not showing'.localize(),
    },
    {
      title: 'Frontmost Application'.localize(),
      action: 'toggleCurrentOption',
      icon: 'currentTemplate',
      label:
        keepCurrent == true || keepCurrent == undefined
          ? 'keeping'.localize()
          : 'quitting'.localize(),
    },
    {
      title: 'Finder Windows'.localize(),
      action: 'toggleFinderWindowsOption',
      icon: 'windowStackTemplate',
      label:
        keepFinderWindowsOption == true || keepFinderWindowsOption == undefined
          ? 'keeping'.localize()
          : 'closing'.localize(),
    },
    {
      title: 'Add Unlisted Application…'.localize(),
      icon: 'addTemplate',
      action: 'addApplication',
    },
  ];

  // Process applications
  const contextApps = contextJSON.apps || [];
  const { excludedApps, exList } = contextApps.reduce(
    (acc, item) => {
      if (!File.exists(item.path)) return acc;

      const title = File.displayName(item.path).replace('.app', '');
      return {
        excludedApps: [
          ...acc.excludedApps,
          {
            title,
            path: item.path,
            icon: item.id,
            action: 'toggleExclude',
            actionArgument: item.path,
            label: 'keeping'.localize(),
          },
        ],
        exList: [...acc.exList, item.path],
      };
    },
    { excludedApps: [], exList: [] }
  );

  contextJSON.apps = contextApps.filter((item) => File.exists(item.path));
  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);

  excludedApps.sort((a, b) => a.title > b.title);

  // Process included applications
  const customApps = Action.preferences.customApps || [];
  const validCustomApps = customApps.filter((path) => {
    const infoPlistPath = `${path}/Contents/Info.plist`;
    return File.exists(infoPlistPath);
  });

  Action.preferences.customApps = validCustomApps;

  const includedAppsFromCustom = validCustomApps.reduce((acc, path) => {
    if (exList.includes(path)) return acc;

    const title = File.displayName(path).replace('.app', '');
    const infoPlist = File.readPlist(`${path}/Contents/Info.plist`);
    return [
      ...acc,
      {
        title,
        path,
        icon: infoPlist.CFBundleIdentifier,
        action: 'toggleExclude',
        actionArgument: path,
      },
    ];
  }, []);

  // Get system applications
  const appDirectories = [
    '/System/Applications/',
    '/Applications/',
    '/System/Applications/Utilities/',
  ];

  const includedApps = appDirectories.reduce((acc, dir) => {
    const apps = File.getDirectoryContents(dir);
    return [...acc, ...getApplications(dir, apps, exList)];
  }, includedAppsFromCustom);

  includedApps.sort((a, b) => a.title > b.title);

  return [...menuItems, ...excludedApps, ...includedApps];
}

// MARK: - Application Management

function getApplications(appsPath, apps, exList) {
  return apps
    .filter((item) => item.endsWith('.app'))
    .reduce((acc, item) => {
      const path = appsPath + item;
      if (!File.exists(path)) return acc;

      const infoPlist = getInfoPlist(path);
      if (!infoPlist) return acc;

      const { appID, agentApp } = infoPlist;
      const title = File.displayName(path).replace('.app', '');

      if (
        !appID ||
        exList.includes(path) ||
        title === 'LaunchBar' ||
        agentApp
      ) {
        return acc;
      }

      return [
        ...acc,
        {
          title,
          path,
          icon: appID,
          action: 'toggleExclude',
          actionArgument: path,
        },
      ];
    }, []);
}

function getInfoPlist(path) {
  const standardPath = `${path}/Contents/Info.plist`;
  if (File.exists(standardPath)) {
    const infoPlist = File.readPlist(standardPath);
    return {
      appID: infoPlist.CFBundleIdentifier,
      agentApp: infoPlist.LSUIElement,
    };
  }

  const wrapper = `${path}/Wrapper/`;
  if (!File.exists(wrapper)) return null;

  const iosApp = File.getDirectoryContents(wrapper).find((item) =>
    item.endsWith('.app')
  );

  if (!iosApp) return null;

  const wrapperPlist = File.readPlist(`${wrapper}${iosApp}/Info.plist`);
  return {
    appID: wrapperPlist.CFBundleIdentifier,
    agentApp: wrapperPlist.LSUIElement,
  };
}

// MARK: - Menu Options

function toggleContextSetting(optionName) {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  // Treat undefined as true initially
  const currentValue = contextJSON[optionName];
  contextJSON[optionName] = currentValue === undefined ? false : !currentValue;
  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);
  return showOptions();
}

function toggleAlertOption() {
  return toggleContextSetting('showAlert');
}

function toggleCurrentOption() {
  return toggleContextSetting('keepCurrent');
}

function toggleFinderWindowsOption() {
  return toggleContextSetting('keepFinderWindowsOption');
}

// MARK: - Application Exclusion Management

function toggleExclude(path) {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const apps = contextJSON.apps || [];

  // Find if app is already in the list
  const existingIndex = apps.findIndex((app) => app.path === path);

  if (existingIndex !== -1) {
    // Remove app if it exists
    apps.splice(existingIndex, 1);
  } else {
    // Add app if it doesn't exist
    const infoPlist = getInfoPlist(path);
    if (infoPlist && infoPlist.appID) {
      apps.push({
        path: path,
        id: infoPlist.appID,
      });
    }
  }

  contextJSON.apps = apps;
  File.writeJSON(contextJSON, Action.preferences.contextJSONFile);
  return showOptions();
}

// MARK: - Dialog and Confirmation

function showQuitConfirmationAlert(exclusions) {
  const { commandArray, keepCurrentString, keepFinderWindowsOption, listOnly } =
    prepareQuitCommand(exclusions, true);

  const result = LaunchBar.execute(
    ...commandArray,
    exclusions.join(','),
    keepCurrentString,
    keepFinderWindowsOption,
    listOnly
  ).split('\n');

  const appsToQuit = result[0];
  const finderWindowCount = parseInt(result[1] || '0');

  if (!appsToQuit && keepFinderWindowsOption === 'true') {
    LaunchBar.alert('No Application to quit.'.localize());
    LaunchBar.hide();
    return;
  }

  if (!appsToQuit && finderWindowCount === 0) {
    LaunchBar.alert('No Application to quit, no window to close.'.localize());
    LaunchBar.hide();
    return;
  }

  const dialog = buildDialogMessage(
    appsToQuit,
    finderWindowCount,
    keepFinderWindowsOption
  );

  const response = LaunchBar.alert(
    'Quit Applications'.localize(),
    dialog,
    'Ok',
    'Cancel'
  );

  LaunchBar.hide();
  if (response === 0) quitApplications(exclusions);
}

// MARK: - Application Quitting

function quitApplications(exclusions) {
  LaunchBar.hide();

  const { commandArray, keepCurrentString, keepFinderWindowsOption, listOnly } =
    prepareQuitCommand(exclusions, false);

  const result = LaunchBar.execute(
    ...commandArray,
    exclusions.join(','),
    keepCurrentString,
    keepFinderWindowsOption,
    listOnly
  );

  LaunchBar.log(result); // non-terminated apps (if any), appsToQuit, finderWindowCount
}

// MARK: - Helper Functions

function prepareQuitCommand(exclusions, listOnly = false) {
  const contextJSON = File.readJSON(Action.preferences.contextJSONFile);
  const keepFinderWindowsOption =
    contextJSON.keepFinderWindowsOption == false ? false : true;
  const keepCurrent = contextJSON.keepCurrent;

  let hasExecutable = false;
  if (File.exists(`${Action.path}/Contents/Scripts/quitApplications`)) {
    hasExecutable = true;
  }

  const commandArray = hasExecutable
    ? ['./quitApplications']
    : ['/usr/bin/swift', './quitApplications.swift'];

  const keepCurrentString = String(
    keepCurrent ||
      keepCurrent == undefined ||
      (LaunchBar.options.commandKey ? true : false)
  );

  return {
    commandArray,
    keepCurrentString,
    keepFinderWindowsOption: String(keepFinderWindowsOption),
    listOnly: String(listOnly),
  };
}

function buildDialogMessage(
  appsToQuit,
  finderWindowCount,
  keepFinderWindowsOption
) {
  if (
    keepFinderWindowsOption === 'false' &&
    appsToQuit &&
    finderWindowCount > 0
  ) {
    return (
      'Quit '.localize() +
      appsToQuit +
      ' and close '.localize() +
      finderWindowCount +
      ' Finder windows.'.localize()
    );
  }
  if (appsToQuit) {
    return 'Quit '.localize() + appsToQuit;
  }

  if (finderWindowCount > 0) {
    return (
      'Close '.localize() + finderWindowCount + ' Finder Window(s).'.localize()
    );
  }
  return '';
}

function addApplication() {
  LaunchBar.hide();
  const customApp = LaunchBar.executeAppleScript(
    `tell application "Finder"
       activate
       set _default to "Applications:" as alias
       set _app to choose file default location _default
       set _app to POSIX path of _app
    end tell`
  )
    .trim()
    .replace(/\/$/, '');

  if (!customApp) return;

  Action.preferences.customApps = Array.from(
    new Set([...(Action.preferences.customApps || []), customApp])
  );

  return showOptions();
}
