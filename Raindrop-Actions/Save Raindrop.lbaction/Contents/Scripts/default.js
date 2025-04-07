/* 
Save Raindrop - Raindrop.io Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

OAuth implementation by Manfred Linzner (@mlinzner)

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.raindrop.io

Other sources: 
- https://macscripter.net/viewtopic.php?id=22375 MacScripter / fastest way to get the name of the frontmost application?
- https://github.com/raguay/MyLaunchBarActions/blob/92884fb2132e55c922232a80db9ddfb90b2471c4/NotePad%20-%20Set%20Note.lbaction/Contents/Scripts/default.js#L126 - PUT method

Note: I used Cursor to refactor the code.
*/

include('global.js');

const SUPPORTED_BROWSERS = {
  'com.apple.safari': {
    name: 'Safari',
    getInfo: (id) =>
      LaunchBar.executeAppleScript(
        `tell application id "${id}"\n` +
          `  set _title to name of front document\n` +
          `  set _url to URL of front document\n` +
          `  return _title & "\n" & _url\n` +
          `end tell`
      ),
  },
  'com.brave.browser': {
    name: 'Brave',
    getInfo: (id) =>
      LaunchBar.executeAppleScript(
        `tell application id "${id}"\n` +
          `  set _title to title of active tab of front window\n` +
          `  set _url to URL of active tab of front window\n` +
          `  return _title & "\n" & _url\n` +
          `end tell`
      ),
  },
  'org.chromium.chromium': { name: 'Chromium', getInfo: 'chrome' },
  'com.google.chrome': { name: 'Chrome', getInfo: 'chrome' },
  'com.vivaldi.vivaldi': { name: 'Vivaldi', getInfo: 'chrome' },
  'com.microsoft.edgemac': { name: 'Edge', getInfo: 'chrome' },
  'company.thebrowser.Browser': { name: 'Browser', getInfo: 'chrome' },
  'org.mozilla.firefox': { name: 'Firefox', unsupported: true },
};

const getDefaultBrowser = () => {
  const plist = File.readPlist(
    '~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist'
  );
  const handler = plist.LSHandlers.find(
    (handler) => handler.LSHandlerURLScheme === 'http'
  );
  return handler?.LSHandlerRoleAll || 'com.apple.safari';
};

const getFrontmostBrowser = () => {
  const frontmost = LaunchBar.executeAppleScript(
    'tell application "System Events" to return bundle identifier of application processes whose frontmost is true as string'
  )
    .trim()
    .toLowerCase();
  return SUPPORTED_BROWSERS[frontmost] ? frontmost : null;
};

const handleFirefox = () => {
  const response = LaunchBar.alert(
    'Firefox is not supported',
    'Due to the lack of decent automation options Firefox is not supported. I recommend using a different browser or try the official Raindrop.io extension for this browser.',
    'Install Firefox extension',
    'Cancel'
  );

  if (response === 0) {
    LaunchBar.openURL(
      'https://addons.mozilla.org/de/firefox/addon/raindropio/',
      'Firefox'
    );
  }
  LaunchBar.hide();
};

const getBrowserInfo = (browserId) => {
  if (browserId === 'org.mozilla.firefox') {
    handleFirefox();
    return null;
  }

  const browser = SUPPORTED_BROWSERS[browserId];
  const getInfoFn =
    typeof browser.getInfo === 'string'
      ? SUPPORTED_BROWSERS['com.brave.browser'].getInfo
      : browser.getInfo;

  const [name, link] = getInfoFn(browserId).trim().split('\n');

  return { name, link };
};

const getRaindropAppURL = () =>
  File.exists('/Applications/Raindrop.io.app')
    ? File.fileURLForPath('/Applications/Raindrop.io.app')
    : 'https://app.raindrop.io';

const formatTags = (tags) => tags.map((tag) => `#${tag}`).join(' ');

const createResultItem = (type, item) => {
  const link =
    item.link.length > 30
      ? item.link.replace(/^(.*\/\/[^\/?#]*).*$/, '$1')
      : item.link;

  return [
    {
      title: `${type}: ${item.title}`,
      subtitle: `${link} ${formatTags(item.tags)}`,
      alwaysShowsSubtitle: true,
      icon: 'drop',
      url: getRaindropAppURL(),
    },
  ];
};

const updateRaindrop = (rID, apiKey, name, link, tags) => {
  const putURL = `https://api.raindrop.io/rest/v1/raindrop/${rID}/?access_token=${apiKey}`;
  const req = HTTP.createRequest(putURL, {
    method: 'PUT',
    body: { title: name, link, tags },
    bodyType: 'json',
  });

  const response = HTTP.loadRequest(req);
  return eval('[' + response.data + ']')[0];
};

const createRaindrop = (apiKey, name, link, tags) => {
  const response = HTTP.postJSON(
    `https://api.raindrop.io/rest/v1/raindrop?access_token=${apiKey}`,
    { body: { title: name, link, tags } }
  );
  return eval('[' + response.data + ']')[0];
};

const checkInternetConnection = () => {
  const output = LaunchBar.execute('/sbin/ping', '-o', 'www.raindrop.io');
  if (!output) {
    LaunchBar.alert('You seem to have no internet connection!');
    return false;
  }
  return true;
};

const handleAPIError = (error) => {
  if (error === 'Incorrect access_token') {
    setAPIkey();
  } else {
    LaunchBar.alert(error);
  }
};

function run(argument) {
  const browserId = getFrontmostBrowser() || getDefaultBrowser();
  const browserInfo = getBrowserInfo(browserId);

  if (!browserInfo) return;
  if (!browserInfo.link) {
    LaunchBar.alert('No URL found!');
    LaunchBar.hide();
    return;
  }
  if (!browserInfo.link.startsWith('http')) {
    LaunchBar.alert(`${browserInfo.link} is not a supported URL!`);
    LaunchBar.hide();
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) return initiateOAuthFlow();

  const tags = argument ? argument.split(', ') : [];

  // Check if URL exists
  const checkURL = HTTP.postJSON(
    `https://api.raindrop.io/rest/v1/import/url/exists?access_token=${apiKey}`,
    { body: { urls: [browserInfo.link] } }
  );

  if (checkURL.error) return LaunchBar.alert(checkURL.error);

  const urlExists = eval('[' + checkURL.data + ']')[0];

  if (urlExists.duplicates.length > 0) {
    const response = LaunchBar.alert(
      'You bookmarked this website before!',
      `URL: ${browserInfo.link}\nDo you want to update the existing entry? WARNING: This will overwrite the existing title and tags!`,
      'Update',
      'Open App',
      'Cancel'
    );

    switch (response) {
      case 0: {
        const updated = updateRaindrop(
          urlExists.ids,
          apiKey,
          browserInfo.name,
          browserInfo.link,
          tags
        );
        if (updated?.item) {
          return createResultItem('Updated', updated.item);
        }
        if (updated?.errorMessage) {
          handleAPIError(updated.errorMessage);
        }
        if (!updated && !checkInternetConnection()) {
          setAPIkey();
        }
        break;
      }
      case 1:
        LaunchBar.openURL(getRaindropAppURL());
        break;
    }
  } else {
    const created = createRaindrop(
      apiKey,
      browserInfo.name,
      browserInfo.link,
      tags
    );
    if (created?.item) {
      return createResultItem('Saved', created.item);
    }
    if (created?.errorMessage) {
      handleAPIError(created.errorMessage);
    }
    if (!created && !checkInternetConnection()) {
      setAPIkey();
    }
  }
}
