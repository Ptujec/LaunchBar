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

const localDataFile = Action.supportPath + '/list';
const op = '/usr/local/bin/op';

function run() {
  var accountID = Action.preferences.accountID;

  if (
    !File.exists(op) ||
    !File.exists(localDataFile) ||
    accountID == undefined ||
    LaunchBar.options.controlKey
  ) {
    var response = LaunchBar.alert(
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

  var list = JSON.parse(
    File.readText(localDataFile).toStringFromBase64String()
  );

  var results = [];
  var logins = [];
  list.forEach(function (item) {
    // Choose icon per category
    var category = item.category.toLowerCase();
    var iconPath = Action.path + '/Contents/Resources/' + category + '.png';

    var pushData = {
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
    };

    if (item.additional_information != '—') {
      pushData.subtitle = item.additional_information;
    }

    if (item.urls != undefined) {
      item.urls.forEach(function (item) {
        if (item.primary == true) {
          pushData.actionArgument.url = item.href;
        }
      });
    }

    if (!File.exists(iconPath)) {
      pushData.icon = 'genericTemplate';
    }

    // if (item.vault.name == 'Screenshots') {
    if (category == 'login') {
      logins.push(pushData);
    } else {
      results.push(pushData);
    }
    // }
  });

  results.sort(function (a, b) {
    return a.icon.localeCompare(b.icon) || a.title.localeCompare(b.title);
  });

  logins.sort(function (a, b) {
    return a.title > b.title;
  });

  var all = logins.concat(results);
  return all;
}

// SET UP AND MAINTAINANCE FUNCTIONS

function settings() {
  if (Action.preferences.secondaryBrowser != undefined) {
    var browserIcon = Action.preferences.secondaryBrowser;
  } else {
    var browserIcon = 'browserTemplate';
  }
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
  var accounts = LaunchBar.execute(op, 'account', 'list', '--format=json');

  if (accounts.trim() == '[]') {
    var response = LaunchBar.alert(
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

  var results = [];
  accounts.forEach(function (item) {
    var pushData = {
      title: item.url,
      subtitle: item.email,
      icon: 'accountTemplate',
      badge: 'account'.localize(),
      action: 'setAccountID',
      actionArgument: item.account_uuid,
      actionRunsInBackground: true,
    };

    if (item.account_uuid == Action.preferences.accountID) {
      pushData.icon = 'selectedAccountTemplate';
    }

    results.push(pushData);
  });

  return results;
}

function setAccountID(accountID) {
  LaunchBar.hide();
  Action.preferences.accountID = accountID;
  updateLocalData();
}

function updateLocalData() {
  LaunchBar.hide();
  var test = signIn();

  if (test != 'success') {
    LaunchBar.alert(test);
    LaunchBar.hide();
    LaunchBar.execute(
      op,
      'signout',
      '--account=' + Action.preferences.accountID
    );
    return;
  }

  var list = LaunchBar.execute(
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
  if (Action.preferences.accountID == undefined) {
    return showAccounts();
  }

  var cmd =
    '/usr/local/bin/op signin --account ' + Action.preferences.accountID;

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

  var secondaryBrowser = Action.preferences.secondaryBrowser;
  if (secondaryBrowser == undefined) {
    secondaryBrowser = '';
  }

  var defaultBrowser = getDefaultBrowser();

  var result = [];
  if (defaultBrowser != 'com.apple.safari') {
    result.push({
      title: 'Safari',
      icon: 'com.apple.Safari',
      action: 'setSecondaryBrowser',
      actionArgument: 'com.apple.Safari',
    });
  }

  var installedApps = File.getDirectoryContents('/Applications/');
  installedApps.forEach(function (item) {
    if (item.endsWith('.app')) {
      var infoPlistPath = '/Applications/' + item + '/Contents/Info.plist';

      if (File.exists(infoPlistPath)) {
        var infoPlist = File.readPlist(infoPlistPath);
        var bundleName = infoPlist.CFBundleName;
        var appID = infoPlist.CFBundleIdentifier;
        var activityTypes = infoPlist.NSUserActivityTypes;

        if (
          activityTypes != undefined &&
          defaultBrowser.toLowerCase() != appID.toLowerCase() &&
          secondaryBrowser.toLowerCase() != appID.toLowerCase()
        ) {
          activityTypes.forEach(function (item) {
            if (item == 'NSUserActivityTypeBrowsingWeb') {
              result.push({
                title: bundleName,
                icon: appID,
                action: 'setSecondaryBrowser',
                actionArgument: appID,
              });
            }
          });
        }
      }
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

function setSecondaryBrowser(bID) {
  Action.preferences.secondaryBrowser = bID;
  return settings();
}

// ACTION FUNCTIONS

function actions(item) {
  LaunchBar.hide();

  if (item.url == undefined) {
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

  var urlScheme =
    'onepassword://view-item/i?a=' +
    Action.preferences.accountID +
    '&v=' +
    item.vaultId +
    '&i=' +
    item.id;

  LaunchBar.openURL(urlScheme);
}

function openURL(item) {
  // Make shure Browser is live
  if (LaunchBar.options.alternateKey) {
    var browser = Action.preferences.secondaryBrowser;
  } else {
    var browser = getDefaultBrowser();
  }

  // Checks if the menu bar item to lock 1P is enabled. So 'true' means 1P is unlocked. If it is false it will try to sign in. The current method is not ideal because it relies on GUI scripting. But it seems currently the only possible way.
  var test = checkLocked(browser);
  if (test != 'success') {
    LaunchBar.alert(test);
    LaunchBar.hide();
    LaunchBar.execute(
      op,
      'signout',
      '--account=' + Action.preferences.accountID
    );
    return;
  }

  var url = item.url;
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  url = url + '?' + getRandomID() + '=' + item.id;

  LaunchBar.openURL(url, browser);

  // updateLocalData();
}

function getRandomID() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';
  for (var i = 0; i < 26; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function checkLocked(browser) {
  if (Action.preferences.accountID == undefined) {
    return showAccounts();
  }

  var cmd =
    '/usr/local/bin/op signin --account ' + Action.preferences.accountID;

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
