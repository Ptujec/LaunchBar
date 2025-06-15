/* 
Mastodon Home Action for LaunchBar
by Christian Bender (@ptujec)
2025-06-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation: 
- https://www.macstories.net/ios/masto-redirect-a-mastodon-shortcut-to-redirect-profiles-and-posts-to-your-own-instance/
- https://docs.joinmastodon.org/methods/search/

Test: https://mstdn.plus/@lapcatsoftware/109718227833446585
  
*/
String.prototype.localizationTable = 'default';

const URL_SCHEMES = {
  ivory: 'ivory://',
  mammoth: 'mammoth://',
  icecubes: 'icecubesapp://',
  web: 'https://',
};

function run() {
  const apiToken = Action.preferences.apiToken;
  const server = Action.preferences.server;
  const closeOption = Action.preferences.closeOption;

  if (!server) return setInstance(server);
  if (LaunchBar.options.alternateKey) return settings(server, apiToken);

  LaunchBar.hide();

  const appInfo = LaunchBar.execute('/bin/bash', './appInfo.sh').split('\n');
  const [frontmostID, frontmostName, isSupported] = appInfo;

  if (isSupported !== 'true') {
    LaunchBar.alert(frontmostName + ' is not a supported browser!'.localize());
    return;
  }

  const url = LaunchBar.executeAppleScript(
    getBrowserUrlScript(frontmostID)
  ).trim();
  const urlComponents = validateUrl(url);
  if (!urlComponents) return;

  const urlscheme = Action.preferences.openIn
    ? Action.preferences.openInURLScheme
    : URL_SCHEMES.web;

  if (url.includes(server)) {
    LaunchBar.openURL(urlscheme + url, frontmostID);
    // LaunchBar.alert('Your are already at home!'.localize());
    // LaunchBar.hide();
    return;
  }

  if (urlscheme === URL_SCHEMES.ivory) {
    LaunchBar.openURL(urlscheme + 'acct/openURL?url=' + url);
    if (closeOption === 'true') closeURL(url, frontmostID);
    return;
  }

  const homeURL = `${urlscheme}${server}/${urlComponents.user}@${urlComponents.instance}`;
  const isPostId = !isNaN(parseInt(urlComponents.unknown));

  if (isPostId) {
    handlePostUrl(homeURL, server, apiToken, url, frontmostID, closeOption);
  } else {
    handleAccountUrl(
      homeURL,
      server,
      apiToken,
      url,
      frontmostID,
      closeOption,
      urlscheme
    );
  }
}

function handlePostUrl(
  homeURL,
  server,
  apiToken,
  url,
  frontmostID,
  closeOption
) {
  const statusData = HTTP.getJSON(
    `https://${server}/api/v2/search?q=${url}&type=statuses&resolve=true`,
    {
      headerFields: { Authorization: `Bearer ${apiToken}` },
    }
  );

  if (statusData.response.status !== 200) {
    LaunchBar.alert(
      `Error: ${statusData.response.status}`,
      statusData.response.localizedStatus
    );
    return;
  }

  const finalUrl = `${homeURL}/${statusData.data.statuses[0].id}`;
  LaunchBar.openURL(finalUrl, frontmostID);

  if (closeOption === 'true') closeURL(url, frontmostID);
}

function handleAccountUrl(
  homeURL,
  server,
  apiToken,
  url,
  frontmostID,
  closeOption,
  urlscheme
) {
  if (urlscheme === URL_SCHEMES.mammoth) {
    LaunchBar.openURL(url.replace('https://', urlscheme));
    if (closeOption === 'true') closeURL(url, frontmostID);
    return;
  }

  LaunchBar.openURL(homeURL, frontmostID);

  if (urlscheme === URL_SCHEMES.icecubes) {
    if (closeOption === 'true') closeURL(url, frontmostID);
    return;
  }

  if (!apiToken) return setApiKey();

  const searchURL = `https://${server}/api/v2/search?q=${encodeURIComponent(
    url
  )}&type=accounts&resolve=true`;
  const accountData = HTTP.getJSON(searchURL, {
    headerFields: { Authorization: `Bearer ${apiToken}` },
  });

  if (accountData.response.status !== 200) {
    LaunchBar.alert(
      `Error: ${accountData.response.status}`,
      accountData.response.localizedStatus
    );
    return;
  }

  const acct = accountData.data.accounts[0].acct;
  const homeURLAPI = `${urlscheme}${server}/@${acct}`;

  if (homeURL !== homeURLAPI) {
    LaunchBar.openURL(homeURLAPI, frontmostID);
    closeURL(homeURL, frontmostID);
  }

  if (closeOption === 'true') closeURL(url, frontmostID);
}

function getBrowserUrlScript(frontmostID) {
  return frontmostID === 'com.apple.Safari'
    ? `tell application id "${frontmostID}" to set _url to URL of front document`
    : `tell application id "${frontmostID}" to set _url to URL of active tab of front window`;
}

function validateUrl(url) {
  if (url === 'missing value' || url === 'favorites://' || url === '') {
    LaunchBar.alert('No current website found!'.localize());
    LaunchBar.hide();
    return null;
  }

  if (!url.includes('@')) {
    LaunchBar.alert('Seems to be no valid account or post!'.localize());
    LaunchBar.hide();
    return null;
  }

  const parts = url.split('/');
  return {
    instance: parts[2],
    user: parts[3],
    unknown: parts[4],
  };
}

function closeURL(url, frontmostID) {
  const script =
    frontmostID === 'com.apple.Safari'
      ? `tell application id "${frontmostID}"
        repeat with _window in windows
          set _tabs to tabs of _window
          repeat with _tab in _tabs
            if URL of _tab is "${url}" then
              set _tabtoclose to _tab
              exit repeat
            end if
          end repeat
        end repeat
        try
          close _tabtoclose
        end try
      end tell`
      : `tell application id "${frontmostID}"
        repeat with _window in windows
          tell _window
            close (every tab whose URL is "${url}")
          end tell
        end repeat
      end tell`;

  LaunchBar.executeAppleScript(script);
}

// MARK: - Settings

function settings() {
  const server = Action.preferences.server;
  const openInLabel = Action.preferences.openIn
    ? 'Opens: '.localize() + Action.preferences.openInName
    : 'Open: Website'.localize();
  const openIcon = Action.preferences.openIn
    ? Action.preferences.openInIcon
    : 'safariTemplate';

  const { xArg, xIcon, label } =
    Action.preferences.closeOption !== 'true'
      ? { xArg: 'true', xIcon: 'xOffTemplate', label: 'Off'.localize() }
      : { xArg: 'false', xIcon: 'xTemplate', label: 'On'.localize() };

  return [
    {
      title: 'Close Original Site'.localize(),
      action: 'closeOriginalToggle',
      actionArgument: xArg,
      label,
      icon: xIcon,
    },
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
      action: 'setApiKey',
      icon: 'keyTemplate',
    },
  ];
}

function closeOriginalToggle(xArg) {
  Action.preferences.closeOption = xArg;
  return settings();
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

function setApiKey() {
  const server = Action.preferences.server;
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
    case 1:
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
          headerFields: { Authorization: `Bearer ${clipboardContent}` },
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

function setInstance(server) {
  LaunchBar.hide();
  const defaultAnswer = server || 'mastodon.social';
  const dialog =
    'Enter the name of the Mastodon instance or server where your account is hosted!'.localize();
  const dialogTitle = 'Mastodon Instance'.localize();

  const newServer = LaunchBar.executeAppleScript(
    'set result to display dialog "' +
      dialog +
      '" with title "' +
      dialogTitle +
      '" default answer "' +
      defaultAnswer +
      '"',
    'set result to text returned of result'
  ).trim();

  Action.preferences.server = newServer;
}
