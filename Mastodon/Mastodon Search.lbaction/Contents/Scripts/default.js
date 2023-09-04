/* 
Mastodon Search Action for LaunchBar
by Christian Bender (@ptujec)
2023-01-14

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://docs.joinmastodon.org/methods/search/
- https://docs.joinmastodon.org/methods/accounts/#follow
- https://docs.joinmastodon.org/methods/tags/#follow

*/
String.prototype.localizationTable = 'default';
const server = Action.preferences.server;
const apiToken = Action.preferences.apiToken;

function run(argument) {
  // Settings
  if (LaunchBar.options.shiftKey) {
    return settings(server, apiToken);
  }

  // Set Mastodon Server/Instance
  if (server == undefined || server == '') {
    setInstance(server);
    return;
  }

  if (argument.length < 2) {
    return;
  }

  // Search
  let searchURL, searchData;
  if (apiToken) {
    // Search Accounts & Hashtags with ␣ (space)
    searchURL = `https://${server}/api/v2/search?q=${encodeURIComponent(
      argument
    )}&resolve=true`;

    searchData = HTTP.getJSON(searchURL, {
      headerFields: {
        Authorization: 'Bearer ' + apiToken,
      },
    });
  } else {
    searchURL = `https://${server}/api/v2/search?q=${encodeURIComponent(
      argument
    )}`;
    searchData = HTTP.getJSON(searchURL);
  }

  //  Error Message
  let e;
  if (searchData.response.status != 200) {
    if (searchData.data.error) {
      e = searchData.data.error;
    } else {
      e = '';
    }

    LaunchBar.alert(
      `Error ${searchData.response.status}: ${searchData.response.localizedStatus}`,
      e
    );
    return;
  }

  //  Accounts
  let accountResults = [];
  const accounts = searchData.data.accounts;

  for (const account of accounts) {
    const bot = account.bot;
    const followersCount = account.followers_count;
    const followingCount = account.following_count;

    // if (bot == false && followersCount + followingCount > 0) {
    if (followersCount + followingCount > 0) {
      const userId = account.id;
      const userhandle = '@' + account.acct;
      const displayName = account.display_name;
      const url = account.url;
      const follower = followersCount.toString() + ' follower(s)';

      let subtitle, icon;
      if (bot == true) {
        subtitle = userhandle + ' (bot)';
        icon = 'botTemplate';
      } else {
        subtitle = userhandle;
        icon = 'accountTemplate';
      }

      accountResults.push({
        title: displayName,
        subtitle,
        alwaysShowsSubtitle: true,
        label: follower,
        action: 'actAccount',
        actionArgument: { url, userhandle, server, userId },
        icon,
      });
    }
  }

  // Hashtags
  let hashtagResults = [];
  const hashtags = searchData.data.hashtags;

  for (const hashtag of hashtags) {
    const hName = hashtag.name;
    const title = hName.toLowerCase();
    const url = hashtag.url;

    hashtagResults.push({
      title,
      action: 'actHashtag',
      actionArgument: {
        hashtag: hName,
        url,
      },
      icon: 'hashtagTemplate',
    });
  }

  return [...accountResults, ...hashtagResults];
}

function actAccount(dict) {
  LaunchBar.hide();
  if (LaunchBar.options.commandKey) {
    // Open page on the account's home server
    LaunchBar.openURL(dict.url);
    return;
  }

  if (LaunchBar.options.controlKey) {
    // Copy userhandle
    LaunchBar.setClipboardString(dict.userhandle);
    return;
  }

  if (LaunchBar.options.alternateKey) {
    followAccount(dict);
    return;
  }

  // Open in prefered client
  let urlscheme;
  if (Action.preferences.openIn != true) {
    urlscheme = 'https://';
  } else {
    urlscheme = Action.preferences.openInURLScheme;
  }

  // Ivory
  if (urlscheme == 'ivory://') {
    LaunchBar.openURL(urlscheme + 'acct/openURL?url=' + dict.url);
    return;
  }

  // Fix for Mammoth
  if (urlscheme == 'mammoth://') {
    LaunchBar.openURL(dict.url.replace('https://', urlscheme));
    return;
  }

  LaunchBar.openURL(urlscheme + dict.server + '/' + dict.userhandle);
}

function actHashtag(dict) {
  LaunchBar.hide();
  let urlscheme;
  if (LaunchBar.options.commandKey) {
    // Open in prefered client
    if (Action.preferences.openIn != true) {
      urlscheme = 'https://';
    } else {
      urlscheme = Action.preferences.openInURLScheme;
    }
    // Ivory
    if (urlscheme == 'ivory://') {
      LaunchBar.openURL(urlscheme + 'acct/search?q=' + dict.hashtag);
      return;
    }

    LaunchBar.openURL(urlscheme + 'mastodon.social/tags/' + dict.hashtag);
    return;
  }

  if (LaunchBar.options.alternateKey) {
    followHashtag(dict);
    return;
  }

  // Open on mastodon.social
  LaunchBar.openURL('http://mastodon.social/tags/' + dict.hashtag);
}

function followAccount(dict) {
  // Set API Token
  if (!apiToken) {
    setApiToken();
    return;
  }

  // Follow
  const followURL = `https://${server}/api/v1/accounts/${dict.userId}/follow`;

  const result = HTTP.postJSON(followURL, {
    headerFields: {
      Authorization: 'Bearer ' + apiToken,
    },
  });

  //  Error Message
  if (result.response.status != 200) {
    LaunchBar.alert(
      `Error: ${result.response.status}`,
      result.response.localizedStatus
    );
    return;
  }

  LaunchBar.hide();
  LaunchBar.executeAppleScript(
    'do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/end_record.caf"'
  ); // Play Sound

  // Open … maybe will remove that … or make it a setting
  const urlscheme =
    Action.preferences.openIn != true
      ? 'https://'
      : Action.preferences.openInURLScheme;

  LaunchBar.openURL(urlscheme + dict.server + '/' + dict.userhandle);
}

function followHashtag(dict) {
  // Set API Token
  if (!apiToken) {
    setApiToken();
    return;
  }

  // Follow
  const followURL = `https://${server}/api/v1/tags/${dict.hashtag}/follow`;

  const result = HTTP.postJSON(followURL, {
    headerFields: {
      Authorization: 'Bearer ' + apiToken,
    },
  });

  //  Error Message
  if (result.response.status != 200) {
    LaunchBar.alert(
      `Error: ${result.response.status}`,
      result.response.localizedStatus
    );
    return;
  }

  LaunchBar.hide();
  LaunchBar.executeAppleScript(
    'do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/end_record.caf"'
  ); // Play Sound

  // Open … maybe will remove that … or make it a setting
  const url = (Action.preferences.openIn = true
    ? url.replace('https://', Action.preferences.openInURLScheme)
    : dict.url);

  LaunchBar.openURL(url);
}

function settings() {
  let openInLabel, openIcon;
  if (Action.preferences.openIn != true) {
    openInLabel = 'Open: Website'.localize();
    openIcon = 'safariTemplate';
  } else {
    openInLabel = 'Opens: '.localize() + Action.preferences.openInName;
    openIcon = Action.preferences.openInIcon;
  }

  return [
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
      action: 'setApiToken',
      icon: 'keyTemplate',
    },
  ];
}

function openSetting() {
  return [
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
      title: 'Open: Ivory'.localize(),
      action: 'openIn',
      actionArgument: {
        urlscheme: 'ivory://',
        name: 'Ivory',
        icon: 'ivoryTemplate',
      },
      icon: 'ivoryTemplate',
    },
    {
      title: 'Open: Mona'.localize(),
      action: 'openIn',
      actionArgument: {
        urlscheme: 'mona://',
        name: 'Mona',
        icon: 'monaTemplate',
      },
      icon: 'monaTemplate',
    },
    {
      title: 'Open: Mammoth'.localize(),
      action: 'openIn',
      actionArgument: {
        urlscheme: 'mammoth://',
        name: 'Mammoth',
        icon: 'mammothTemplate',
      },
      icon: 'mammothTemplate',
    },
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
}

function openIn(dict) {
  Action.preferences.openIn = true;
  Action.preferences.openInURLScheme = dict.urlscheme;
  Action.preferences.openInName = dict.name;
  Action.preferences.openInIcon = dict.icon;

  return settings();
}

function setApiToken() {
  const response = LaunchBar.alert(
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
        const statusData = HTTP.getJSON(
          `https://${server}/api/v2/search?q=test&type=statuses&resolve=true`,
          {
            headerFields: {
              Authorization: 'Bearer ' + clipboardContent,
            },
          }
        );

        //  Error Message
        if (statusData.response.status != 200) {
          LaunchBar.alert(
            `Error: ${statusData.response.status}`,
            statusData.response.localizedStatus
          );
          return;
        }
        // Write new API-Token in Action preferences
        Action.preferences.apiToken = clipboardContent;

        LaunchBar.alert(
          'Success!',
          'API-Token set to: ' + Action.preferences.apiToken
        );
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
  const defaultAnswer = !server ? 'mastodon.social' : server;

  const dialog =
    'Enter the name of the Mastodon instance or server where your account is hosted!'.localize();
  const dialogTitle = 'Mastodon Instance'.localize();

  Action.preferences.server = LaunchBar.executeAppleScript(
    `set result to display dialog "${dialog}" with title "${dialogTitle}" default answer "${defaultAnswer}"`,
    'set result to text returned of result'
  ).trim();

  return;
}
