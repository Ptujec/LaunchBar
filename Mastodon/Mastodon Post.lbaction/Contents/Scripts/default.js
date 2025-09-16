/* 
Mastodon Post (Toot) Action for LaunchBar
by Christian Bender (@ptujec)
2025-06-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation: 
- https://www.macstories.net/ios/masto-redirect-a-mastodon-shortcut-to-redirect-profiles-and-posts-to-your-own-instance/
- https://docs.joinmastodon.org/methods/statuses/#create
  
*/
String.prototype.localizationTable = 'default';

function run(argument) {
  const { apiToken, server, openIn, openInURL } = Action.preferences;
  if (!server) return setInstance(server);
  if (!apiToken) return setApiToken();
  if (LaunchBar.options.shiftKey) return settings();

  if (argument.length > 500) {
    LaunchBar.alert('You excited the 500 character limit!'.localize());
    return;
  }

  const language = 'en';
  let postURL = `https://${server}/api/v1/statuses?language=${language}&status=${encodeURIComponent(
    argument
  )}`;

  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    const dialog = 'Content: '.localize() + '\\"' + argument + '\\"';
    const dialogTitle = 'Content Warning'.localize();
    const defaultAnswer = 'Content Warning'.localize();
    const spoilerText = LaunchBar.executeAppleScript(
      'set result to display dialog "' +
        dialog +
        '" with title "' +
        dialogTitle +
        '" default answer "' +
        defaultAnswer +
        '"',
      'set result to text returned of result'
    ).trim();

    if (!spoilerText) return;
    postURL +=
      '&sensitive=true&spoiler_text=' + encodeURIComponent(spoilerText);
  }

  const result = HTTP.postJSON(postURL, {
    headerFields: { Authorization: `Bearer ${apiToken}` },
  });

  if (result.response.status !== 200) {
    LaunchBar.alert(
      'Error: ' + result.response.status,
      result.response.localizedStatus
    );
    return;
  }

  LaunchBar.hide();
  LaunchBar.executeAppleScript(
    'do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/SentMessage.caf"'
  );

  if (openIn) {
    LaunchBar.openURL(openInURL);
  }
}

function setApiToken() {
  const { server } = Action.preferences;
  const response = LaunchBar.alert(
    'API-Token required',
    '1) Read the instructions on how to create an API-Token.\n2) Press "Set API-Token"\n\nThe API-Token will be stored in the action preferences (~/Library/Application Support/LaunchBar/Action Support).',
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
        { headerFields: { Authorization: `Bearer ${clipboardContent}` } }
      );

      if (statusData.response.status !== 200) {
        LaunchBar.alert(
          'Error: ' + statusData.response.status,
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
  return;
}

function setInstance(server) {
  LaunchBar.hide();
  const defaultAnswer = server || 'mastodon.social';
  const dialog =
    'Enter the name of the Mastodon instance or server where your account is hosted!'.localize();
  const dialogTitle = 'Mastodon Instance'.localize();
  const newServer = LaunchBar.executeAppleScript(
    `set result to display dialog "${dialog}" with title "${dialogTitle}" default answer "${defaultAnswer}"`,
    'set result to text returned of result'
  ).trim();

  if (newServer) {
    Action.preferences.server = newServer;
  }
  return settings();
}

function settings() {
  const { server, openIn, openInName, openInIcon, count } = Action.preferences;
  const openInLabel = !openIn
    ? 'Off'.localize()
    : 'Opens: '.localize() + openInName;
  const openIcon = !openIn ? 'openTemplate' : openInIcon;
  const showTitle =
    count !== 'always'
      ? 'Only show count if above 400 characters'.localize()
      : 'Always show count'.localize();
  const countArg = count !== 'always' ? 'always' : '';
  const countIcon =
    count !== 'always' ? 'countIconOffTemplate' : 'countIconOnTemplate';

  return [
    {
      title: showTitle,
      action: 'countToggle',
      actionArgument: countArg,
      icon: countIcon,
    },
    {
      title: 'Open after done'.localize(),
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
  const { server } = Action.preferences;

  const clients = [
    {
      name: 'Phanpy',
      url: 'https://phanpy.social',
      icon: 'phanpyTemplate',
    },
    {
      name: 'Elk',
      url: 'https://elk.zone/home',
      icon: 'elkTemplate',
    },
    {
      name: 'Ivory',
      url: 'ivory://acct/home',
      icon: 'ivoryTemplate',
    },
    {
      name: 'Mona',
      url: `mona://${server}/home`,
      icon: 'monaTemplate',
    },
    {
      name: 'Mammoth',
      url: File.fileURLForPath('/Applications/Mammoth.app'),
      icon: 'mammothTemplate',
    },
    {
      name: 'Ice Cubes',
      url: `IceCubesApp://${server}/home`,
      icon: 'icecubesTemplate',
    },
    {
      name: 'Website',
      url: `https://${server}/home`,
      icon: 'safariTemplate',
    },
  ];

  return [
    ...clients.map((client) => ({
      title: `Open: ${client.name}`.localize(),
      action: 'openIn',
      actionArgument: {
        url: client.url,
        name: client.name,
        icon: client.icon,
      },
      icon: client.icon,
    })),
    {
      title: 'Off'.localize(),
      action: 'openInOff',
      icon: 'xTemplate',
    },
  ];
}

function openIn(dict) {
  Action.preferences.openIn = true;
  Action.preferences.openInURL = dict.url;
  Action.preferences.openInName = dict.name;
  Action.preferences.openInIcon = dict.icon;
  return settings();
}

function openInOff() {
  Action.preferences.openIn = false;
  return settings();
}

function countToggle(countArg) {
  Action.preferences.count = countArg;
  return settings();
}
