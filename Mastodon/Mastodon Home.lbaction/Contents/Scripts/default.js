/* 
Mastodon Home Action for LaunchBar
by Christian Bender (@ptujec)
2023-01-20

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation: 
- https://www.macstories.net/ios/masto-redirect-a-mastodon-shortcut-to-redirect-profiles-and-posts-to-your-own-instance/
- https://docs.joinmastodon.org/methods/search/

Test: https://mstdn.plus/@lapcatsoftware/109718227833446585
  
*/
String.prototype.localizationTable = 'default';

function run() {
  var apiToken = Action.preferences.apiToken;
  var server = Action.preferences.server;
  var closeOption = Action.preferences.closeOption;

  // Set Mastodon Server/Instance
  if (server == undefined || server == '') {
    setInstance(server);
    return;
  }

  if (LaunchBar.options.shiftKey) {
    var output = settings(server, apiToken);
    return output;
  }

  // Get current website from Safari
  var url = LaunchBar.executeAppleScript(
    'tell application "Safari" to set _URL to URL of front document'
  ).trim();

  if (url == 'missing value' || url == 'favorites://' || url == '') {
    LaunchBar.alert('No current website found in Safari!'.localize());
    LaunchBar.hide();
    return;
  }

  if (!url.includes('@')) {
    LaunchBar.alert('Seems to be no valid account or post!'.localize());
    LaunchBar.hide();
    return;
  }

  var res = url.split('/');
  var instance = res[2];
  var user = res[3];
  var post = res[4];

  // Open in prefered client
  if (Action.preferences.openIn != true) {
    var urlscheme = 'https://';
  } else {
    var urlscheme = Action.preferences.openInURLScheme;
  }

  if (instance == server && urlscheme == 'https://') {
    LaunchBar.alert('Your are already at home!'.localize());
    return;
  }

  var homeURL = urlscheme + server + '/' + user + '@' + instance;

  if (post != undefined) {
    // Post/Status URL
    var statusData = HTTP.getJSON(
      'https://' +
        server +
        '/api/v2/search?q=' +
        url +
        '&type=statuses&resolve=true',
      {
        headerFields: {
          Authorization: 'Bearer ' + apiToken,
        },
      }
    );

    //  Error Message
    if (statusData.response.status != 200) {
      LaunchBar.alert(
        'Error: ' + statusData.response.status,
        statusData.response.localizedStatus
      );
      return;
    }

    // File.writeJSON(statusData, Action.supportPath + '/test.json');
    // return;

    var id = statusData.data.statuses[0].id;

    homeURL = homeURL + '/' + id;
    LaunchBar.hide();
    LaunchBar.openURL(homeURL);
  } else {
    // Account URL
    LaunchBar.hide();
    LaunchBar.openURL(homeURL);

    // Check homeURL via API … if not correct replace it -- it's faster for most accounts not using the API straight away. But some won't work like e.g. https://mastodon.macstories.net/@viticci

    // Exception for Ice Cubes … not necessary
    if (urlscheme == 'icecubesapp://') {
      if (closeOption == 'true') {
        closeURL(url);
      }
      return;
    }

    if (apiToken == undefined) {
      setApiKey();
      return;
    }

    var searchURL =
      'https://' +
      server +
      '/api/v2/search?q=' +
      encodeURIComponent(url) +
      '&type=accounts&resolve=true';

    var accountData = HTTP.getJSON(searchURL, {
      headerFields: {
        Authorization: 'Bearer ' + apiToken,
      },
    });

    //  Error Message
    if (accountData.response.status != 200) {
      LaunchBar.alert(
        'Error: ' + accountData.response.status,
        accountData.response.localizedStatus
      );
      return;
    }

    // File.writeJSON(accountData, Action.supportPath + '/test.json');
    // return;

    var acct = accountData.data.accounts[0].acct;
    var homeURLAPI = urlscheme + server + '/' + '@' + acct;

    if (homeURL != homeURLAPI) {
      LaunchBar.openURL(homeURLAPI);
      closeURL(homeURL);
    }
  }

  if (closeOption == 'true') {
    closeURL(url);
  }
  return;
}

function settings() {
  var server = Action.preferences.server;

  if (Action.preferences.openIn != true) {
    var openInLabel = 'Open: Website'.localize();
    var openIcon = 'safariTemplate';
  } else {
    var openInLabel = 'Opens: '.localize() + Action.preferences.openInName;
    var openIcon = Action.preferences.openInIcon;
  }

  if (Action.preferences.closeOption != 'true') {
    var xArg = 'true';
    var xIcon = 'xOffTemplate';
    var label = 'Off'.localize();
  } else {
    var xArg = 'false';
    var xIcon = 'xTemplate';
    var label = 'On'.localize();
  }

  options = [
    {
      title: 'Close Original Site'.localize(),
      action: 'closeOriginalToggle',
      actionArgument: xArg,
      label: label,
      icon: xIcon,
    },
    {
      title: 'Open'.localize(),
      action: 'openSetting',
      label: openInLabel,
      icon: openIcon,
    },
    {
      title: 'Set Instance'.localize(),
      action: 'setInstance',
      label: 'Current Instance: '.localize() + server,
      actionArgument: server,
      icon: 'serverTemplate',
    },
    {
      title: 'Set API-Token'.localize(),
      action: 'setApiKey',
      icon: 'keyTemplate',
    },
  ];

  return options;
}

function closeOriginalToggle(xArg) {
  if (xArg == 'true') {
    Action.preferences.closeOption = 'true';
  } else {
    Action.preferences.closeOption = 'false';
  }

  var output = settings();
  return output;
}

function closeURL(url) {
  LaunchBar.executeAppleScript(
    'tell application "Safari"',
    '	repeat with _window in windows',
    '		set _tabs to tabs of _window',
    '		repeat with _tab in _tabs',
    '			if URL of _tab is "' + url + '" then',
    '				set _tabtoclose to _tab',
    '				exit repeat',
    '			end if',
    '		end repeat',
    '	end repeat',
    '	try',
    '		close _tabtoclose',
    '	end try',
    'end tell'
  );
  return;
}

function openSetting() {
  options = [
    {
      title: 'Open: Ice Cubes'.localize(),
      action: 'openIn',
      actionArgument: {
        urlscheme: 'icecubesapp://',
        name: 'Ice Cubes',
        icon: 'icecubesTemplate',
      },
      icon: 'icecubesTemplate',
    },
    {
      title: 'Open: Elk'.localize(),
      action: 'openIn',
      actionArgument: {
        urlscheme: 'https://elk.zone/',
        name: 'Elk',
        icon: 'elkTemplate',
      },
      icon: 'elkTemplate',
    },
    {
      title: 'Open: Website'.localize(),
      action: 'openIn',
      actionArgument: {
        urlscheme: 'https://',
        name: 'Website',
        icon: 'safariTemplate',
      },
      icon: 'safariTemplate',
    },
  ];

  return options;
}

function openIn(dict) {
  Action.preferences.openIn = true;
  Action.preferences.openInURLScheme = dict.urlscheme;
  Action.preferences.openInName = dict.name;
  Action.preferences.openInIcon = dict.icon;

  var output = settings();
  return output;
}

function setApiKey() {
  var server = Action.preferences.server;
  var response = LaunchBar.alert(
    'API-Token required',
    '1) Read the instructions on how to create an API-Token.\n2) Press "Set API-Token"\n\nThe API-Token will be stored in the action preferences (~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.MastodonHome/Preferences.plist)',
    'Open Instructions & Mastodon Settings',
    'Set API-Token',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.hide();
      LaunchBar.openURL('https://' + server + '/settings/applications');
      LaunchBar.executeAppleScript('delay 0.2');
      LaunchBar.openURL(
        'https://github.com/Ptujec/LaunchBar/tree/master/Mastodon#api-token'
      );
      break;
    case 1:
      var clipboardContent = LaunchBar.getClipboardString().trim();

      if (clipboardContent.length == 43) {
        // Test API-Token
        var statusData = HTTP.getJSON(
          'https://' +
            server +
            '/api/v2/search?q=test&type=statuses&resolve=true',
          {
            headerFields: {
              Authorization: 'Bearer ' + clipboardContent,
            },
          }
        );

        //  Error Message
        if (statusData.response.status != 200) {
          LaunchBar.alert(
            'Error: ' + statusData.response.status,
            statusData.response.localizedStatus
          );
          return;
        } else {
          // Write new API-Token in Action preferences
          Action.preferences.apiToken = clipboardContent;

          LaunchBar.alert(
            'Success!',
            'API-Token set to: ' + Action.preferences.apiToken
          );
        }
      } else {
        LaunchBar.alert(
          'The length of the clipboard content does not match the length of a correct API-Token',
          'Make sure the API-Token is the most recent item in the clipboard!'
        );
      }
      break;
    case 2:
      break;
  }
}

function setInstance(server) {
  LaunchBar.hide();
  if (server == undefined || server == '') {
    var defaultAnswer = 'mastodon.social';
  } else {
    var defaultAnswer = server;
  }

  var dialog =
    'Enter the name of the Mastodon instance or server where your account is hosted!'.localize();
  var dialogTitle = 'Mastodon Instance'.localize();

  var server = LaunchBar.executeAppleScript(
    'set result to display dialog "' +
      dialog +
      '" with title "' +
      dialogTitle +
      '" default answer "' +
      defaultAnswer +
      '"',
    'set result to text returned of result'
  ).trim();
  Action.preferences.server = server;
  return;
}
