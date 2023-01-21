/* 
Mastodon Search Action for LaunchBar
by Christian Bender (@ptujec)
2023-01-14

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

*/
String.prototype.localizationTable = 'default';

function run(argument) {
  var server = Action.preferences.server;

  // Set Mastodon Server/Instance
  if (LaunchBar.options.shiftKey || server == undefined || server == '') {
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
      var user = account.username;
      var displayName = account.display_name;
      var accountServer = account.url.split('/')[2];

      var url = account.url;
      var follower = followersCount.toString() + ' follower(s)';

      var title = displayName;

      if (server == accountServer) {
        var userhandle = '@' + user;
      } else {
        var userhandle = '@' + user + '@' + accountServer;
      }

      if (bot == true) {
        var sub = userhandle + ' (bot)';
        var icon = 'botTemplate';
      } else {
        var sub = userhandle;
        var icon = 'accountTemplate';
      }

      accountResults.push({
        title: title,
        subtitle: sub,
        label: follower,
        action: 'actAccount',
        actionArgument: {
          url: url,
          userhandle: userhandle,
          server: server,
        },
        actionRunsInBackground: true,
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
      actionRunsInBackground: true,
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
    LaunchBar.setClipboardString(dict.userhandle);
  } else {
    // Open page on your preferred server/instance

    LaunchBar.openURL('https://' + dict.server + '/' + dict.userhandle);
  }
}

function actHashtag(dict) {
  LaunchBar.hide();
  if (LaunchBar.options.commandKey) {
    // open on mastodon.social
    LaunchBar.openURL('https://mastodon.social/tags/' + dict.hashtag);
  } else {
    LaunchBar.openURL(dict.url);
  }
}
