/* 
Mastodon Search Action for LaunchBar
by Christian Bender (@ptujec)
2023-01-14

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  var server = Action.preferences.server;

  // Set Mastodon Server/Instance
  if (LaunchBar.options.shiftKey || server == undefined || server == '') {
    if (server == undefined || server == '') {
      var defaultAnswer = 'mastodon.social';
    } else {
      var defaultAnswer = server;
    }

    var server = LaunchBar.executeAppleScript(
      'set result to display dialog "Enter the server name where your account is hosted" with title "Server Name" default answer "' +
        defaultAnswer +
        '"',
      'set result to text returned of result'
    ).trim();
    Action.preferences.server = server;
    LaunchBar.hide();
    return;
  }

  if (argument.length < 2) {
    return;
  }

  // Search Accounts & Hashtags
  var searchURL =
    'https://' + server + '/api/v2/search?q=' + encodeURIComponent(argument);

  var searchData = HTTP.getJSON(searchURL);

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

    if (bot == false && followersCount + followingCount > 0) {
      var user = account.username;
      var displayName = account.display_name;
      var accountServer = account.url.split('/')[2];
      var url = account.url;
      var follower = followersCount.toString() + ' follower(s)';

      var title = displayName;
      var userhandle = '@' + user + '@' + accountServer;

      accountResults.push({
        title: title,
        subtitle: userhandle,
        label: follower,
        action: 'act',
        actionArgument: {
          url: url,
          userhandle: userhandle,
          server: server,
        },
        actionRunsInBackground: true,
        icon: 'accountTemplate',
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
      url: url,
      icon: 'hashtagTemplate',
    });
  });

  var results = accountResults.concat(hashtagResults);

  return results;
}

function act(dict) {
  LaunchBar.hide();
  if (LaunchBar.options.commandKey) {
    // Open page on your preferred server/instance
    LaunchBar.openURL(dict.url);
  } else if (LaunchBar.options.alternateKey) {
    // Copy userhandle
    LaunchBar.setClipboardString(dict.userhandle);
  } else {
    // Open page on the account's home server
    LaunchBar.openURL('https://' + dict.server + '/' + dict.userhandle);
  }
}
