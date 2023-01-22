/* 
Mastodon Search Action for LaunchBar
by Christian Bender (@ptujec)
2023-01-14

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://docs.joinmastodon.org/methods/follow_requests/
- https://docs.joinmastodon.org/methods/tags/#follow

*/
String.prototype.localizationTable = 'default';

function run(argument) {
  var server = Action.preferences.server;

  // Settings
  if (LaunchBar.options.shiftKey) {
    var apiToken = Action.preferences.apiToken;

    var output = settings(server, apiToken);
    return output;
  }

  // Set Mastodon Server/Instance
  if (server == undefined || server == '') {
    setInstance(server);
    return;
  }

  if (argument.length < 2) {
    return;
  }

  // Search Accounts & Hashtags with ␣ (space)
  var searchURL =
    'https://' + server + '/api/v2/search?q=' + encodeURIComponent(argument);

  var searchData = HTTP.getJSON(searchURL);
  // File.writeJSON(searchData, Action.supportPath + '/test.json');
  // return;

  //  Error Message
  if (searchData.response.status != 200) {
    LaunchBar.alert(
      'Error: ' + searchData.response.status,
      searchData.response.localizedStatus
    );
    return;
  }

  //  Accounts
  var accountResults = [];
  var accounts = searchData.data.accounts;

  accounts.forEach(function (item) {
    var account = item;
    var bot = account.bot;
    var followersCount = account.followers_count;
    var followingCount = account.following_count;

    // if (bot == false && followersCount + followingCount > 0) {
    if (followersCount + followingCount > 0) {
      var userId = account.id;
      var userhandle = '@' + account.acct;
      var displayName = account.display_name;
      var url = account.url;
      var follower = followersCount.toString() + ' follower(s)';

      if (bot == true) {
        var sub = userhandle + ' (bot)';
        var icon = 'botTemplate';
      } else {
        var sub = userhandle;
        var icon = 'accountTemplate';
      }

      accountResults.push({
        title: displayName,
        subtitle: sub,
        label: follower,
        action: 'actAccount',
        actionArgument: {
          url: url,
          userhandle: userhandle,
          server: server,
          userId: userId,
        },
        icon: icon,
      });
    }
  });

  // Hashtags
  var hashtagResults = [];
  var hashtags = searchData.data.hashtags;

  hashtags.forEach(function (item) {
    var hashtag = item;
    var hName = hashtag.name;
    var title = hName.toLowerCase();
    var url = hashtag.url;

    hashtagResults.push({
      title: title,
      action: 'actHashtag',
      actionArgument: {
        hashtag: hName,
        url: url,
      },
      icon: 'hashtagTemplate',
    });
  });

  var results = accountResults.concat(hashtagResults);

  return results;
}

function actAccount(dict) {
  LaunchBar.hide();
  if (LaunchBar.options.commandKey) {
    // Open page on the account's home server
    LaunchBar.openURL(dict.url);
  } else if (LaunchBar.options.alternateKey) {
    // Copy userhandle
    // LaunchBar.setClipboardString(dict.userhandle);
    followAccount(dict);
  } else {
    // Open page on your preferred server/instance
    LaunchBar.openURL('https://' + dict.server + '/' + dict.userhandle);
  }
}

function actHashtag(dict) {
  LaunchBar.hide();
  if (LaunchBar.options.commandKey) {
    // Open in home instance
    LaunchBar.openURL(dict.url);
  } else if (LaunchBar.options.alternateKey) {
    followHashtag(dict);
  } else {
    // Open on mastodon.social
    LaunchBar.openURL('https://mastodon.social/tags/' + dict.hashtag);
  }
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
        'https://github.com/Ptujec/LaunchBar/tree/master/Mastodon#1-search-action'
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
  var apiToken = Action.preferences.apiToken;

  options = [
    {
      title: 'Set Instance'.localize(),
      action: 'setInstance',
      label: 'Current Instance: '.localize() + server,
      actionArgument: server,
      icon: 'serverTemplate',
    },
    {
      title: 'Set API Key'.localize(),
      action: 'setApiKey',
      icon: 'keyTemplate',
    },
  ];

  return options;
}

function followAccount(dict) {
  var apiToken = Action.preferences.apiToken;
  var server = Action.preferences.server;

  // Set API Token
  if (apiToken == undefined) {
    setApiKey();
    return;
  }

  // Follow
  var followURL =
    'https://' + server + '/api/v1/accounts/' + dict.userId + '/follow';

  var result = HTTP.postJSON(followURL, {
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
      'do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/end_record.caf"'
    ); // Play Sound

    // Open the site … maybe will remove that … or make it a setting
    LaunchBar.openURL('https://' + dict.server + '/' + dict.userhandle);
  }
}

function followHashtag(dict) {
  var apiToken = Action.preferences.apiToken;
  var server = Action.preferences.server;

  // Set API Token
  if (apiToken == undefined) {
    setApiKey();
    return;
  }

  // Follow
  var followURL =
    'https://' + server + '/api/v1/tags/' + dict.hashtag + '/follow';

  var result = HTTP.postJSON(followURL, {
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
      'do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/end_record.caf"'
    ); // Play Sound

    // Open the site … maybe will remove that … or make it a setting
    LaunchBar.openURL(dict.url);
  }
}
