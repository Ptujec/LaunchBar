/* 
Elk (the Mastodon client) Action for LaunchBar including Search and redirect
by Christian Bender (@ptujec)
2023-01-23

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://docs.joinmastodon.org/methods/search/
- https://docs.joinmastodon.org/methods/follow_requests/
- https://docs.joinmastodon.org/methods/tags/#follow
*/

String.prototype.localizationTable = 'default';

function run(argument) {
  // Settings
  if (LaunchBar.options.shiftKey) {
    var output = settings(server, apiToken);
    return output;
  }

  if (argument == undefined) {
    LaunchBar.hide();
    if (LaunchBar.options.commandKey) {
      // Redirect current mastodon site in Safari to Elk.zone
      var url = LaunchBar.executeAppleScript(
        'tell application "Safari" to set _URL to URL of front document'
      ).trim();

      if (url == 'missing value' || url == 'favorites://' || url == '') {
        LaunchBar.alert('No current website found in Safari!');
        LaunchBar.hide();
        return;
      }

      if (url.endsWith('home')) {
        url = '';
      }

      var elkUrl = 'https://elk.zone/' + url;

      LaunchBar.executeAppleScript(
        'delay 0.2',
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
    } else {
      var elkUrl = 'https://elk.zone/home';
    }
    LaunchBar.openURL(elkUrl);
  } else {
    var server = Action.preferences.server;
    var apiToken = Action.preferences.apiToken;

    // Set Mastodon Server/Instance
    if (server == undefined || server == '') {
      setInstance(server);
      return;
    }

    if (argument.length < 2) {
      return;
    }
    // Search
    if (apiToken != undefined) {
      // Search Accounts & Hashtags with ␣ (space)
      var searchURL =
        'https://' +
        server +
        '/api/v2/search?q=' +
        encodeURIComponent(argument) +
        '&resolve=true';

      var searchData = HTTP.getJSON(searchURL, {
        headerFields: {
          Authorization: 'Bearer ' + apiToken,
        },
      });
    } else {
      var searchURL =
        'https://' +
        server +
        '/api/v2/search?q=' +
        encodeURIComponent(argument);
      var searchData = HTTP.getJSON(searchURL);
    }

    // File.writeJSON(searchData, Action.supportPath + '/test.json');
    // return;

    //  Error Message
    if (searchData.response.status != 200) {
      if (searchData.data.error != undefined) {
        var e = searchData.data.error;
      } else {
        var e = '';
      }

      LaunchBar.alert(
        'Error ' +
          searchData.response.status +
          ': ' +
          searchData.response.localizedStatus,
        e
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
}

function actAccount(dict) {
  LaunchBar.hide();
  if (LaunchBar.options.alternateKey) {
    // Copy userhandle
    // LaunchBar.setClipboardString(dict.userhandle);
    followAccount(dict);
  } else {
    // Open page on Elk
    LaunchBar.openURL(
      'https://elk.zone/' + dict.server + '/' + dict.userhandle
    );
  }
}

function actHashtag(dict) {
  LaunchBar.hide();
  if (LaunchBar.options.commandKey) {
    // Open on mastodon.social
    LaunchBar.openURL('https://mastodon.social/tags/' + dict.hashtag);
  } else if (LaunchBar.options.alternateKey) {
    followHashtag(dict);
  } else {
    // Open on Elk
    LaunchBar.openURL('https://elk.zone/mastodon.social/tags/' + dict.hashtag);
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
      title: 'Set API-Token'.localize(),
      action: 'setApiToken',
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
    setApiToken();
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
    LaunchBar.openURL(
      'https://elk.zone/' + dict.server + '/' + dict.userhandle
    );
  }
}

function followHashtag(dict) {
  var apiToken = Action.preferences.apiToken;
  var server = Action.preferences.server;

  // Set API Token
  if (apiToken == undefined) {
    setApiToken();
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
