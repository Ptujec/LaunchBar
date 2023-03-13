/* 
Passwords - 1Password 8 Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation: 
- https://developer.1password.com/docs/cli/create-item/#retrieve-an-item
- https://developer.1password.com/docs/cli/reference/management-commands/item#item-get
- https://github.com/dteare/opbookmarks#app-integration

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
  - require login?
  - update on open item
  - show/hide additional_information (subtitles)
- Warnung: 
  - lokal aber unverschlüsselte Daten (keine Passwörter)
  - wenn locked get autofill nicht … erst beim zweiten mal danach
  - autofill geht manchmal nicht
  - some category icons missing 
- JSON verschlüsseln?
*/

const localJSONFile = Action.supportPath + '/list.json';
const op = '/usr/local/bin/op';

function run() {
  var accountID = Action.preferences.accountID;

  if (
    !File.exists(op) ||
    accountID == undefined ||
    LaunchBar.options.controlKey
  ) {
    var response = LaunchBar.alert(
      'First run info',
      'This actions requires 1Password\'s CLI.\nPress "Open Guide" for how to install and enable it.\nOn first run your account ID will be stored in Action Preferences. You can reset your account ID any time with "⌃↩".\nFor performance reasons the output is stored in a JSON file in the action\'s support folder. Refresh with "⌥↩".\nBoth the Preferences.plist and the JSON file can be found here: ~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.Passwords/.',
      'Open Guide',
      'Get Started',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          'https://developer.1password.com/docs/cli/get-started#install'
        );
        break;
      case 1:
        setAccoundID();
        break;
      case 2:
        break;
    }
    return;
  }

  if (LaunchBar.options.alternateKey || !File.exists(localJSONFile)) {
    list = JSON.parse(updateLocalData());
    LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');
  } else {
    var list = File.readJSON(localJSONFile);
  }

  var results = [];
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

    results.push(pushData);
  });

  results.sort(function (a, b) {
    return a.icon.localeCompare(b.icon) || a.title.localeCompare(b.title);
  });

  return results;
}

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

function setAccoundID() {
  LaunchBar.hide();
  LaunchBar.execute(op, 'signin');

  var accountID = LaunchBar.execute(op, 'whoami', '--format=json');

  accountID = JSON.parse(accountID).account_uuid;
  Action.preferences.accountID = accountID;
}

function getRandomID() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';
  for (var i = 0; i < 26; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function updateLocalData() {
  var list = LaunchBar.execute(op, 'item', 'list', '--format=json');
  if (list == '') {
    return;
  }
  File.writeText(list, localJSONFile);
  return list;
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
  LaunchBar.openURL(url);
  // updateLocalData();
}
