/* 
Kagi.com Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  var apiToken = Action.preferences.apiToken;

  // Set API Token
  if (apiToken == undefined || LaunchBar.options.shiftKey) {
    setApiToken();
    return;
  }

  // LaunchBar.hide();
  LaunchBar.openURL(
    'https://kagi.com/search?token=' +
      apiToken +
      '&q=' +
      encodeURIComponent(argument)
  );
}

function setApiToken() {
  var response = LaunchBar.alert(
    'API-Token required',
    '1) Open Kagi Settings. Copy your Session Link.\n2) Press "Set API-Token".\nYour API-Token will be extracted from the link and stored in the Action preferences (~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.KagiCom/Preferences.plist).',
    'Open Kagi Settings',
    'Set API-Token',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.hide();
      LaunchBar.openURL('https://kagi.com/settings?p=user_details');
      break;
    case 1:
      var clipboardContent = LaunchBar.getClipboardString().trim();

      if (!clipboardContent.startsWith('https://kagi.com/search?token')) {
        LaunchBar.alert('This clipboard item is no valid session link!');
        return;
      }

      var apiToken = clipboardContent.match(
        /https:\/\/kagi.com\/search\?token=(.+)&q=%s/
      )[1];

      Action.preferences.apiToken = apiToken;

      LaunchBar.alert('Success!', 'API-Token set to: ' + apiToken);

      break;
    case 2:
      break;
  }
}
