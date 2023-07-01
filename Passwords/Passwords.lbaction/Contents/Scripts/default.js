/*
Passwords - 1Password 8 Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
  1Password:
  - https://developer.1password.com/docs/cli/create-item/#retrieve-an-item
  - https://developer.1password.com/docs/cli/reference/management-commands/item#item-get
  - https://github.com/dteare/opbookmarks#app-integration (for url schemes and autofill info)

  LaunchBar:
  - https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
  - https://www.obdev.at/resources/launchbar/help/URLCommands.html

Alfed Workflow:
- https://github.com/alfredapp/1password-workflow
Raycast Extension:
- https://github.com/raycast/extensions/tree/a773745cd8555874d9d528c629308836d55ed6bf/extensions/1password/
*/

String.prototype.localizationTable = 'default';

const localDataFile = `${Action.supportPath}/list`;
const op = '/usr/local/bin/op';

function run() {
  const accountID = Action.preferences.accountID;

  if (
    !File.exists(op) ||
    !File.exists(localDataFile) ||
    !accountID ||
    LaunchBar.options.controlKey
  ) {
    const response = LaunchBar.alert(
      'First run info:'.localize(),
      '1) This action requires 1Password\'s CLI. Press "Open guide" for how to install and enable it.\n2) Then press "Get started" and choose your account.\nFor performance reasons the output is stored the action\'s support folder (~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.Passwords/).\nRefresh data in action settings (⌥↩).'.localize(),
      'Open guide'.localize(),
      'Get started'.localize(),
      'Cancel'.localize()
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          'https://developer.1password.com/docs/cli/get-started#install'
        );
        break;
      case 1:
        return showAccounts();
      case 2:
        break;
    }
    return;
  }

  if (LaunchBar.options.alternateKey) {
    return settings();
  }

  const list = JSON.parse(
    File.readText(localDataFile).toStringFromBase64String()
  );

  let results = [];
  let logins = [];

  for (item of list) {
    const category = item.category.toLowerCase();
    const iconPath = `${Action.path}/Contents/Resources/${category}.png`;

    const pushData = {
      title: item.title,
      label: item.vault.name,
      icon: category,
      updated: item.updated_at,
      action: 'actions',
      actionArgument: {
        id: item.id,
        category: category,
        vaultId: item.vault.id,
      },
      actionRunsInBackground: true,
      alwaysShowsSubtitle: true,
    };

    if (item.additional_information !== '—') {
      pushData.subtitle = item.additional_information;
    }

    const primaryUrl = item.urls?.find((url) => url.primary === true);
    if (primaryUrl) {
      pushData.actionArgument.url = primaryUrl.href;
    }

    if (!File.exists(iconPath)) {
      pushData.icon = 'genericTemplate';
    }

    if (category === 'login') {
      logins.push(pushData);
    } else {
      results.push(pushData);
    }
  }

  results.sort(function (a, b) {
    return a.icon.localeCompare(b.icon) || a.title.localeCompare(b.title);
  });

  logins.sort(function (a, b) {
    return a.title > b.title;
  });

  return logins.concat(results);
}

// SET UP AND MAINTAINANCE FUNCTIONS

function settings() {
  const browserIcon = Action.preferences.secondaryBrowser ?? 'browserTemplate';

  return [
    {
      title: 'Secondary browser'.localize(),
      icon: browserIcon,
      children: chooseSecondaryBrowser(),
    },
    {
      title: 'Choose account and update action data'.localize(),
      icon: 'accountsTemplate',
      action: 'showAccounts',
      // children: showAccounts(),
    },
    {
      title: 'Update action data'.localize(),
      icon: 'updateTemplate',
      action: 'updateLocalData',
      actionRunsInBackground: true,
    },
    {
      title: 'Update 1Password CLI'.localize(),
      icon: 'cliTemplate',
      action: 'updateCLI',
      actionRunsInBackground: true,
    },
  ];
}

function showAccounts() {
  let accounts = LaunchBar.execute(op, 'account', 'list', '--format=json');

  if (accounts.trim() == '[]') {
    const response = LaunchBar.alert(
      'Something went wrong!'.localize(),
      "Please check if you have 1Password-CLI enabled in 1Password Settings/Developer.\nIf you have and it still doesn't work let me know.".localize(),
      'Open 1Password Settings'.localize(),
      'Report Issue'.localize(),
      'Cancel'.localize()
    );
    switch (response) {
      case 0:
        LaunchBar.openURL('onepassword://settings');
        break;
      case 1:
        LaunchBar.openURL('https://github.com/Ptujec/LaunchBar/issues');
        break;
      case 2:
        break;
    }
    LaunchBar.hide();
    return;
  }

  accounts = JSON.parse(accounts);

  return accounts.map(function (item) {
    return {
      title: item.url,
      subtitle: item.email,
      icon:
        item.account_uuid == Action.preferences.accountID
          ? 'selectedAccountTemplate'
          : 'accountTemplate',
      badge: 'account'.localize(),
      action: 'setAccountID',
      actionArgument: item.account_uuid,
      actionRunsInBackground: true,
    };
  });
}

function setAccountID(accountID) {
  LaunchBar.hide();
  Action.preferences.accountID = accountID;
  updateLocalData();
}

function updateLocalData() {
  LaunchBar.hide();
  const test = signIn();
  if (test != 'success') {
    errorAlertAndSignout(test);
    return;
  }

  let list = LaunchBar.execute(
    op,
    'item',
    'list',
    '--account=' + Action.preferences.accountID,
    '--format=json'
  );

  // Convert to a Base64 String
  list = list.toBase64Data();
  File.writeData(list, localDataFile);

  LaunchBar.displayNotification({
    title: 'Passwords Action'.localize(),
    string: 'All set. Data is up to date.'.localize(),
  });

  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  LaunchBar.openURL(
    'x-launchbar:select?abbreviation=' + 'Passwords'.localize()
  );
}

function signIn() {
  if (!Action.preferences.accountID) {
    return showAccounts();
  }

  const cmd = `${op} signin --account ${Action.preferences.accountID}`;

  return LaunchBar.executeAppleScript(
    'try',
    '	set _e to do shell script "' + cmd + '"',
    'on error _e',
    '	return _e as string',
    '	tell application "LaunchBar" to activate',
    'end try',
    'tell me to "exit"',
    'return "success"'
  ).trim();
}

function errorAlertAndSignout(test) {
  LaunchBar.alert(test);
  LaunchBar.hide();
  LaunchBar.execute(op, 'signout', '--account=' + Action.preferences.accountID);
}

function updateCLI() {
  LaunchBar.executeAppleScript(
    'tell application "Terminal"',
    '	activate',
    '	do script "op  update"',
    'end tell'
  );
}

function chooseSecondaryBrowser() {
  // List all installed browser (from /Applications/ & Safari) execpt the default browser and the currently chosen browser
  const secondaryBrowser = Action.preferences.secondaryBrowser ?? '';
  const defaultBrowser = getDefaultBrowser();

  let result = [];
  if (defaultBrowser != 'com.apple.safari') {
    result.push({
      title: 'Safari',
      icon: 'com.apple.Safari',
      action: 'setSecondaryBrowser',
      actionArgument: 'com.apple.Safari',
    });
  }

  const installedApps = File.getDirectoryContents('/Applications/');
  // installedApps.forEach(function (item) {
  for (item of installedApps) {
    if (item.endsWith('.app')) {
      const infoPlistPath = '/Applications/' + item + '/Contents/Info.plist';

      if (File.exists(infoPlistPath)) {
        const infoPlist = File.readPlist(infoPlistPath);
        const bundleName = infoPlist.CFBundleName;
        const appID = infoPlist.CFBundleIdentifier;
        const activityTypes = infoPlist.NSUserActivityTypes;

        if (
          activityTypes &&
          defaultBrowser.toLowerCase() != appID.toLowerCase() &&
          secondaryBrowser.toLowerCase() != appID.toLowerCase()
        ) {
          for (item of activityTypes) {
            if (item == 'NSUserActivityTypeBrowsingWeb') {
              result.push({
                title: bundleName,
                icon: appID,
                action: 'setSecondaryBrowser',
                actionArgument: appID,
              });
            }
          }
        }
      }
    }
  }

  return result;
}

function getDefaultBrowser() {
  const plist = File.readPlist(
    '~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist'
  );

  const defaultBrowser = plist.LSHandlers.find(
    (item) => item.LSHandlerURLScheme == 'http'
  );

  return defaultBrowser ? defaultBrowser.LSHandlerRoleAll.toLowerCase() : '';
}

function setSecondaryBrowser(bID) {
  Action.preferences.secondaryBrowser = bID;
  return settings();
}

// ACTION FUNCTIONS

function actions(item) {
  LaunchBar.hide();

  if (!item.url) {
    viewItem(item);
    return;
  }

  if (item.category == 'login') {
    if (!LaunchBar.options.commandKey) {
      openURL(item);
    } else {
      viewItem(item);
    }
  } else {
    if (!LaunchBar.options.commandKey) {
      viewItem(item);
    } else {
      openURL(item);
    }
  }
  return;
}

function viewItem(item) {
  LaunchBar.openURL('file:///Applications/1Password.app/');
  const urlScheme = `onepassword://view-item/i?a=${Action.preferences.accountID}&v=${item.vaultId}&i=${item.id}`;
  LaunchBar.openURL(urlScheme);
}

function openURL(item) {
  // Make shure Browser is live
  const browser = LaunchBar.options.alternateKey
    ? Action.preferences.secondaryBrowser
    : getDefaultBrowser();

  // Checks if the menu bar item to lock 1P is enabled. So 'true' means 1P is unlocked. If it is false it will try to sign in. The current method is not ideal because it relies on GUI scripting. But it seems currently the only possible way.
  const test = checkLocked(browser);
  if (test != 'success') {
    errorAlertAndSignout(test);
    return;
  }

  let url = item.url.startsWith('http') ? item.url : `https://${item.url}`;
  url += `?${getRandomID()}=${item.id}`;

  LaunchBar.openURL(url, browser);

  // updateLocalData();
}

function getRandomID() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';
  let counter = 0;
  while (counter < 26) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
    counter++;
  }
  return result;
}

function checkLocked(browser) {
  if (!Action.preferences.accountID) {
    return showAccounts();
  }

  const cmd = `${op} signin --account ${Action.preferences.accountID}`;

  return LaunchBar.executeAppleScript(
    'tell application "System Events"',
    '	if (name of processes) contains "1Password" then',
    '		try',
    '			tell process "1Password"',
    '				set AXEnabled to value of attribute "AXEnabled" of menu item 5 of menu "1Password" of menu bar item "1Password" of menu bar 1',
    '			end tell',
    '		end try',
    '	else',
    '		set AXEnabled to false',
    '	end if',
    '	',
    '	if AXEnabled is false then',
    '		try',
    '			set _e to do shell script "' + cmd + '"',
    '		on error _e',
    '			return _e as string',
    '			tell application "LaunchBar" to activate',
    '		end try',
    '		tell application id "' + browser + '" to activate',
    '		tell me to "exit"',
    '	end if',
    'end tell',
    // 'delay 2', // just for testing
    'return "success"'
  ).trim();
}
