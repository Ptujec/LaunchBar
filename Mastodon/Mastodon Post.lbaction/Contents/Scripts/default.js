/* 
Mastodon Post (Toot) Action for LaunchBar
by Christian Bender (@ptujec)
2023-01-20

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation: 
- https://www.macstories.net/ios/masto-redirect-a-mastodon-shortcut-to-redirect-profiles-and-posts-to-your-own-instance/
- https://docs.joinmastodon.org/methods/statuses/#create
  
*/
String.prototype.localizationTable = 'default';

function run(argument) {
  var apiToken = Action.preferences.apiToken;
  var server = Action.preferences.server;

  // Set Mastodon Server/Instance
  if (server == undefined || server == '') {
    setInstance(server);
    return;
  }

  // Set API Token
  if (apiToken == undefined) {
    setApiToken();
    return;
  }

  // Settings
  if (LaunchBar.options.shiftKey) {
    var output = settings(server, apiToken);
    return output;
  }

  // Check character limit
  if (parseInt(argument.length) > 500) {
    LaunchBar.alert('You excited the 500 character limit!'.localize());
    return;
  }

  // Post
  var postURL =
    'https://' +
    server +
    '/api/v1/statuses?status=' +
    encodeURIComponent(argument);

  if (LaunchBar.options.commandKey) {
    // Content Warning
    LaunchBar.hide();

    var dialog = 'Content: '.localize() + '\\"' + argument + '\\"';
    var dialogTitle = 'Content Warning'.localize();
    var defaultAnswer = 'Content Warning'.localize();

    var spoilerText = LaunchBar.executeAppleScript(
      'set result to display dialog "' +
        dialog +
        '" with title "' +
        dialogTitle +
        '" default answer "' +
        defaultAnswer +
        '"',
      'set result to text returned of result'
    ).trim();

    if (spoilerText == '') {
      return;
    }

    postURL =
      postURL +
      '&sensitive=true&spoiler_text=' +
      encodeURIComponent(spoilerText);
  }

  var result = HTTP.postJSON(postURL, {
    headerFields: {
      Authorization: 'Bearer ' + apiToken,
    },
  });

  // File.writeJSON(result, Action.supportPath + '/test.json');

  //  Error Message
  if (result.response.status != 200) {
    LaunchBar.alert(
      'Error: ' + result.response.status,
      result.response.localizedStatus
    );
    return;
  } else {
    LaunchBar.hide();
    LaunchBar.executeAppleScript(
      'do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/SentMessage.caf"'
    ); // Play Sound

    if (Action.preferences.openIn == true) {
      // Open Mastodon Timeline
      LaunchBar.openURL(Action.preferences.openInURL);
    }
  }
}

function setApiToken() {
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

function settings() {
  var server = Action.preferences.server;

  if (Action.preferences.openIn != true) {
    var openInLabel = 'Off'.localize();
    var openIcon = 'openTemplate';
  } else {
    var openInLabel = 'Opens: '.localize() + Action.preferences.openInName;
    var openIcon = Action.preferences.openInIcon;
  }

  if (Action.preferences.count != 'always') {
    var showTitle = 'Only show count if above 400 characters'.localize();
    var countArg = 'always';
    var countIcon = 'countIconOffTemplate';
  } else {
    var showTitle = 'Always show count'.localize();
    var countArg = '';
    var countIcon = 'countIconOnTemplate';
  }

  options = [
    {
      title: showTitle,
      action: 'countToggle',
      actionArgument: countArg,
      icon: countIcon,
    },
    {
      title: 'Open after done'.localize(),
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
      action: 'setApiToken',
      icon: 'keyTemplate',
    },
  ];

  return options;
}

function openSetting() {
  var server = Action.preferences.server;

  options = [
    {
      title: 'Open: Elk'.localize(),
      action: 'openIn',
      actionArgument: {
        url: 'https://elk.zone/home',
        name: 'Elk',
        icon: 'elkTemplate',
      },
      icon: 'elkTemplate',
    },
    {
      title: 'Open: Ivory'.localize(),
      action: 'openIn',
      actionArgument: {
        url: 'ivory://acct/home',
        name: 'Ivory',
        icon: 'ivoryTemplate',
      },
      icon: 'ivoryTemplate',
    },
    {
      title: 'Open: Mona'.localize(),
      action: 'openIn',
      actionArgument: {
        url: 'mona://' + server + '/home',
        name: 'Mona',
        icon: 'monaTemplate',
      },
      icon: 'monaTemplate',
    },
    {
      title: 'Open: Mammoth'.localize(),
      action: 'openIn',
      actionArgument: {
        url: File.fileURLForPath('/Applications/Mammoth.app'),
        name: 'Mammoth',
        icon: 'mammothTemplate',
      },
      icon: 'mammothTemplate',
    },
    {
      title: 'Open: Ice Cubes'.localize(),
      action: 'openIn',
      actionArgument: {
        url: 'IceCubesApp://' + server + '/home',
        name: 'Ice Cubes',
        icon: 'icecubesTemplate',
      },
      icon: 'icecubesTemplate',
    },
    {
      title: 'Open: Website'.localize(),
      action: 'openIn',
      actionArgument: {
        url: 'https://' + server + '/home',
        name: 'Website',
        icon: 'safariTemplate',
      },
      icon: 'safariTemplate',
    },
    {
      title: 'Off'.localize(),
      action: 'openInOff',
      icon: 'xTemplate',
    },
  ];

  return options;
}

function openIn(dict) {
  Action.preferences.openIn = true;
  Action.preferences.openInURL = dict.url;
  Action.preferences.openInName = dict.name;
  Action.preferences.openInIcon = dict.icon;

  var output = settings();
  return output;
}

function openInOff(dict) {
  Action.preferences.openIn = false;
  var output = settings();
  return output;
}

function countToggle(countArg) {
  Action.preferences.count = countArg;
  var output = settings();
  return output;
}
