/* 
Passwords - 1Password 8 Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation: 
- https://developer.1password.com/docs/cli/create-item/#retrieve-an-item
- https://developer.1password.com/docs/cli/reference/management-commands/item#item-get
- https://github.com/dteare/opbookmarks#app-integration (for url schemes and autofill info)

Alfed Workflow: 
- https://github.com/alfredapp/1password-workflow
Raycast Extension:
- https://github.com/khasbilegt/1Password/tree/main

TODO:
- Missing Icons: 
  - Database  
  - Driver License                 
  - Outdoor License              
  - Server
  - Social Security Number    
- Detect if app is locked (waiting on info how to)
- Settings
  - require login every time?
  - update on open item?
  - show/hide additional_information (subtitles)
- Support for alternative Browser
*/

const localJSONFile = Action.supportPath + '/list.json';
const op = '/usr/local/bin/op';

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
      '1) This actions requires 1Password\'s CLI.\nPress "Open guide" for how to install and enable it.\n2) Then press "Get started" and choose your account. You can pick a different one later in action settings (⌥↩).\nFor performance reasons the output is stored in a JSON file in the action\'s support folder. Refresh data in action settings (⌥↩).\nYou will get a notification when the setup/refresh is completed.\nBoth the Preferences.plist and the JSON file can be found here: ~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.Passwords/.',
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
    return [
      {
        title: 'Choose account',
        subtitle: 'This will also reset action data',
        icon: 'com.1password.1password',
        action: 'showAccounts',
      },
      {
        title: 'Update action data',
        icon: 'com.1password.1password',
        action: 'updateLocalData',
        actionRunsInBackground: true,
      },
    ];
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
      subtitle: item.additional_information,
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

    if (item.urls != undefined) {
      item.urls.forEach(function (item) {
        if (item.primary == true) {
          pushData.actionArgument.url = item.href;
        }
      });
    }

    if (!File.exists(iconPath)) {
      pushData.icon = 'genericTemplate';
      // pushData.subtitle = category;
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

// Set up and maintainance functions
function showAccounts() {
  var accounts = LaunchBar.execute(op, 'account', 'list', '--format=json');

  if (accounts == '') {
    LaunchBar.alert(
      'Error',
      'Something went wrong. Please try again or contact me.'
    );
    LaunchBar.hide();
    return;
  }

  accounts = JSON.parse(accounts);

  // if (accounts.length == 1) {
  //   setAccountID(accounts[0].account_uuid);
  //   return;
  // }

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

  if (test != 'exit') {
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
  // return list;
}

function signIn() {
  if (Action.preferences.accountID == undefined) {
    var output = showAccounts();
    return output;
  }

  var cmd =
    '/usr/local/bin/op signin --account ' + Action.preferences.accountID;

  var test = LaunchBar.executeAppleScript(
    'try',
    '	set _e to do shell script "' + cmd + '"',
    'on error _e',
    '	return _e as string',
    '	tell application "LaunchBar" to activate',
    'end try',
    'tell me to "exit"'
  ).trim();
  return test;
}

// Action functions

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
  // TODO: Detec if 1Password is locked and only use this when locked
  var fileURL = File.fileURLForPath('/Applications/1Password.app');
  LaunchBar.openURL(fileURL);

  var urlScheme =
    'onepassword://view-item/i?a=' +
    Action.preferences.accountID +
    '&v=' +
    item.vaultId +
    '&i=' +
    item.id;

  LaunchBar.openURL(urlScheme);
  // updateLocalData();
}

function openURL(item) {
  var url = item.url;
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  url = url + '?' + getRandomID() + '=' + item.id;

  // TODO: alternative Browser support
  if (LaunchBar.options.alternateKey) {
    LaunchBar.openURL(url, 'Brave Browser');
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
