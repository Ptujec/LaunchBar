/* 
PodQueue Action for LaunchBar
by Christian Bender (@ptujec)
2024-11-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

*/

include('browser.js');

String.prototype.localizationTable = 'default';

function run(argument) {
  if (!Action.preferences.apiKey || LaunchBar.options.alternateKey)
    return setApiKey();

  const url = argument ? argument : getURL(getBrowser());

  if (!url || url == 'missing value')
    return LaunchBar.alert('No URL found!'.localize());

  const response = LaunchBar.alert(
    'Save URL to PodQueue?'.localize(),
    url,
    'Ok'.localize(),
    'Cancel'.localize()
  );
  switch (response) {
    case 0:
      LaunchBar.hide();
      LaunchBar.openURL(
        `https://podqueue.fm/add_url/siri/${
          Action.preferences.apiKey
        }/${encodeURIComponent(url)}`
      );
    case 1:
      break;
  }
}

function setApiKey() {
  // API Key dialog
  const response = LaunchBar.alert(
    'API key required'.localize(),
    '1) Press "Open PodQueue.fm" to copy your API key. 2) Press "Set API Key"'.localize(),
    'Open Open PodQueue.fm'.localize(),
    'Set API Key'.localize(),
    'Cancel'.localize()
  );
  switch (response) {
    case 0:
      LaunchBar.openURL('https://podqueue.fm/users/api_key');
      LaunchBar.hide();
      break;
    case 1:
      const clipboardContent = LaunchBar.getClipboardString().trim();
      Action.preferences.apiKey = clipboardContent;
      LaunchBar.alert(
        'API key set to: '.localize() + Action.preferences.apiKey
      );
      break;
    case 2:
      break;
  }
}
