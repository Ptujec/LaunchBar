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
- https://github.com/khasbilegt/1Password/tree/main

TODO:
- German localization
- Settings
  - update on open item?
  - show/hide additional_information (subtitles)
*/

const localJSONFile = Action.supportPath + '/list.json';
const op = '/usr/local/bin/op';
const altBrowser = File.readJSON(
  Action.path + '/Contents/Resources/browser.json'
);

function run() {
  var accountID = Action.preferences.accountID;

  if (
    !File.exists(op) ||
    !File.exists(localJSONFile) ||
    accountID == undefined ||
    LaunchBar.options.controlKey
  ) {
    var response = LaunchBar.alert(
      'First run info:',
      '1) This actions requires 1Password\'s CLI.\nPress "Open guide" for how to install and enable it. (Follow the "Install" instructions and also make sure you do step 1 of "Sign in".)\n2) Then press "Get started" and choose your account. You can pick a different one later in action settings (⌥↩).\nFor performance reasons the output is stored in a JSON file in the action\'s support folder. Refresh data in action settings (⌥↩).\nYou will get a notification when the setup/refresh is completed.\nBoth the Preferences.plist and the JSON file can be found here: ~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.Passwords/.',
      'Open guide',
      'Get started',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          'https://developer.1password.com/docs/cli/get-started#install'
        );
        break;
      case 1:
        var output = showAccounts();
        return output;
      case 2:
        break;
    }
    return;
  }

  if (LaunchBar.options.alternateKey) {
    var output = settings();
    return output;
  }

  var list = File.readJSON(localJSONFile);

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

    if (category == 'login') {
      logins.push(pushData);
    } else {
      results.push(pushData);
    }
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
      title: 'Choose account and update action data',
      icon: 'accountsTemplate',
      action: 'showAccounts',
    },
    {
      title: 'Update action data',
      icon: 'updateTemplate',
      action: 'updateLocalData',
      actionRunsInBackground: true,
    },
    {
      title: 'Secondary browser',
      icon: browserIcon,
      children: chooseSecondaryBrowser(),
    },
  ];
}

function showAccounts() {
  var accounts = LaunchBar.execute(op, 'account', 'list', '--format=json');

  if (accounts.trim() == '[]') {
    var response = LaunchBar.alert(
      'Something went wrong!',
      "Please check if you have 1Password-CLI enabled in 1Password Settings/Developer.\nIf you have and it still doesn't work let me know.",
      'Open 1Password Settings',
      'Report Issue',
      'Cancel'
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
      badge: 'account',
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
  File.writeText(list, localJSONFile);

  LaunchBar.displayNotification({
    title: 'Passwords Action',
    string: 'All set. Data is up to date.',
  });

  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  LaunchBar.openURL('x-launchbar:select?abbreviation=Passwords');
}

function signIn() {
  if (Action.preferences.accountID == undefined) {
    var output = showAccounts();
    return output;
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

function chooseSecondaryBrowser() {
  var result = [];
  altBrowser.forEach(function (item) {
    result.push({
      title: item.title,
      icon: item.bundleID,
      action: 'setSecondaryBrowser',
      actionArgument: item.bundleID,
    });
  });
  return result;
}

function setSecondaryBrowser(bID) {
  Action.preferences.secondaryBrowser = bID;

  var output = settings();
  return output;
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
  // Checks if the menu bar item to lock 1P is enabled. So 'true' means 1P is unlocked. If it is false it will try to sign in. The current method is not ideal because it relies on GUI scripting. But it seems currently the only possible way.
  var test = checkLocked();
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

  // Secondary Browser
  if (LaunchBar.options.alternateKey) {
    // LaunchBar falls back to default browser is no secondary browser is set up in action preferences
    LaunchBar.openURL(url, Action.preferences.secondaryBrowser);
  } else {
    LaunchBar.openURL(url);
  }

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

function checkLocked() {
  if (Action.preferences.accountID == undefined) {
    var output = showAccounts();
    return output;
  }

  var cmd =
    '/usr/local/bin/op signin --account ' + Action.preferences.accountID;

  return LaunchBar.executeAppleScript(
    'tell application "System Events"',
    '	if (name of processes) contains "1Password" then',
    '		try',
    '			tell process "1Password"',
    '				set AXEnabled to value of attribute "AXEnabled" of menu item 5 of menu "1Password" of menu bar item "1Password" of menu bar 1 of application process "1Password" of application "System Events"',
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
    '		tell me to "exit"',
    '	end if',
    'end tell',
    'return "success"'
  ).trim();
}
