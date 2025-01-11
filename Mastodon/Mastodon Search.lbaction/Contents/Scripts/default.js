/* 
Mastodon Search Action for LaunchBar
by Christian Bender (@ptujec)
2025-01-11

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
  if (LaunchBar.options.shiftKey) {
    return settings(server, apiToken);
  }

  if (!server) {
    setInstance();
    return;
  }

  if (argument.length < 2) {
    return;
  }

  const searchURL = `https://${server}/api/v2/search?q=${encodeURIComponent(
    argument
  )}&resolve=true`;
  const headers = apiToken ? { Authorization: `Bearer ${apiToken}` } : {};
  const searchData = HTTP.getJSON(searchURL, { headerFields: headers });

  if (searchData.response.status !== 200) {
    const error = searchData.data.error || '';
    LaunchBar.alert(
      `Error ${searchData.response.status}: ${searchData.response.localizedStatus}`,
      error
    );
    return;
  }

  const accountResults = searchData.data.accounts
    .filter((account) => account.followers_count + account.following_count > 0)
    .map((account) => ({
      title: account.display_name,
      subtitle: account.bot ? `@${account.acct} (bot)` : `@${account.acct}`,
      alwaysShowsSubtitle: true,
      label: `${account.followers_count} follower(s)`,
      action: 'actAccount',
      actionArgument: {
        url: account.url,
        userhandle: '@' + account.acct,
        server,
        userId: account.id,
      },
      icon: account.bot ? 'botTemplate' : 'accountTemplate',
    }));

  const hashtagResults = searchData.data.hashtags.map((hashtag) => ({
    title: hashtag.name.toLowerCase(),
    action: 'actHashtag',
    actionArgument: {
      hashtag: hashtag.name,
      url: hashtag.url,
    },
    icon: 'hashtagTemplate',
  }));

  return [...accountResults, ...hashtagResults];
}

function actAccount(dict) {
  LaunchBar.hide();

  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(dict.url);
    return;
  }

  if (LaunchBar.options.controlKey) {
    // Copy userhandle
    LaunchBar.setClipboardString(dict.userhandle);
    return;
  }

  if (LaunchBar.options.shiftKey) {
    // Copy userhandle
    LaunchBar.paste(dict.userhandle);
    return;
  }

  if (LaunchBar.options.alternateKey) {
    followAccount(dict);
    return;
  }

  const urlscheme = Action.preferences.openIn
    ? Action.preferences.openInURLScheme
    : 'https://';

  if (urlscheme === 'ivory://') {
    LaunchBar.openURL(`${urlscheme}acct/openURL?url=${dict.url}`);
    return;
  }

  if (urlscheme === 'mammoth://') {
    LaunchBar.openURL(dict.url.replace('https://', urlscheme));
    return;
  }

  LaunchBar.openURL(`${urlscheme}${dict.server}/${dict.userhandle}`);
}

function actHashtag(dict) {
  LaunchBar.hide();

  if (LaunchBar.options.commandKey) {
    const urlscheme = Action.preferences.openIn
      ? Action.preferences.openInURLScheme
      : 'https://';

    if (urlscheme === 'ivory://') {
      LaunchBar.openURL(`${urlscheme}acct/search?q=${dict.hashtag}`);
      return;
    }

    LaunchBar.openURL(`${urlscheme}mastodon.social/tags/${dict.hashtag}`);
    return;
  }

  if (LaunchBar.options.alternateKey) {
    followHashtag(dict);
    return;
  }

  LaunchBar.openURL(`https://mastodon.social/tags/${dict.hashtag}`);
}

function followEntity(options) {
  if (!apiToken) return setApiToken();

  const { url, successAction } = options;
  const result = HTTP.postJSON(url, {
    headerFields: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (result.response.status !== 200) {
    LaunchBar.alert(
      `Error: ${result.response.status}`,
      result.response.localizedStatus
    );
    return;
  }

  LaunchBar.hide();
  LaunchBar.executeAppleScript(
    'do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/end_record.caf"'
  );

  successAction();
}

function followAccount(dict) {
  followEntity({
    url: `https://${server}/api/v1/accounts/${dict.userId}/follow`,
    successAction: () => {
      const urlscheme = Action.preferences.openIn
        ? Action.preferences.openInURLScheme
        : 'https://';
      LaunchBar.openURL(`${urlscheme}${dict.server}/${dict.userhandle}`);
    },
  });
}

function followHashtag(dict) {
  followEntity({
    url: `https://${server}/api/v1/tags/${dict.hashtag}/follow`,
    successAction: () => {
      const url = Action.preferences.openIn
        ? dict.url.replace('https://', Action.preferences.openInURLScheme)
        : dict.url;
      LaunchBar.openURL(url);
    },
  });
}

function settings() {
  const openInLabel = Action.preferences.openIn
    ? `Opens: ${Action.preferences.openInName}`
    : 'Open: Website'.localize();

  const openIcon = Action.preferences.openIn
    ? Action.preferences.openInIcon
    : 'safariTemplate';

  return [
    {
      title: 'Open'.localize(),
      action: 'openSetting',
      actionReturnsItems: true,
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
      LaunchBar.openURL(`https://${server}/settings/applications`);
      LaunchBar.executeAppleScript('delay 0.2');
      LaunchBar.openURL(
        'https://github.com/Ptujec/LaunchBar/tree/master/Mastodon#api-token'
      );
      break;

    case 1: {
      const clipboardContent = LaunchBar.getClipboardString().trim();

      if (clipboardContent.length !== 43) {
        LaunchBar.alert(
          'The length of the clipboard content does not match the length of a correct API-Token',
          'Make sure the API-Token is the most recent item in the clipboard!'
        );
        return;
      }

      const statusData = HTTP.getJSON(
        `https://${server}/api/v2/search?q=test&type=statuses&resolve=true`,
        {
          headerFields: {
            Authorization: `Bearer ${clipboardContent}`,
          },
        }
      );

      if (statusData.response.status !== 200) {
        LaunchBar.alert(
          `Error: ${statusData.response.status}`,
          statusData.response.localizedStatus
        );
        return;
      }

      Action.preferences.apiToken = clipboardContent;
      LaunchBar.alert(
        'Success!',
        `API-Token set to: ${Action.preferences.apiToken}`
      );
      break;
    }
  }
}

function setInstance(server) {
  LaunchBar.hide();
  const defaultAnswer = server || 'mastodon.social';
  const dialog =
    'Enter the name of the Mastodon instance or server where your account is hosted!'.localize();
  const dialogTitle = 'Mastodon Instance'.localize();

  const result = LaunchBar.executeAppleScript(
    `set result to display dialog "${dialog}" with title "${dialogTitle}" default answer "${defaultAnswer}"`,
    'set result to text returned of result'
  ).trim();

  if (result) Action.preferences.server = result;
  return settings();
}
