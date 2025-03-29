/* 
Search in Maps Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
- https://developer.what3words.com/
*/

String.prototype.localizationTable = 'default'; // For potential localization later

const apiKey = Action.preferences.apiKey;
const w3wRegex = /(?:[a-züäöß]+\.){2}[a-züäöß]+/;

function run(argument) {
  if (LaunchBar.options.commandKey) return setApiKey();

  argument += ' ';
  let saddr, daddr, url;

  const parts = argument.split(/(?: |^)(?:to|nach|von|from) /);
  const deviderMatch = argument.match(/(?: |^)(?:to|nach|von|from) /);

  if (deviderMatch) {
    const devider = deviderMatch[0].trim();

    if (devider == 'von' || devider == 'from') {
      saddr = parts[1]; // source address
      daddr = parts[0]; // destination add
    } else {
      saddr = parts[0]; // source address
      daddr = parts[1]; // destination address
    }

    if (w3wRegex.test(daddr)) {
      daddr = getCooComp(daddr.match(w3wRegex)[0]);
      if (daddr == 'failed') return;
    }

    if (w3wRegex.test(saddr)) {
      saddr = getCooComp(saddr.match(w3wRegex)[0]);
      if (saddr == 'failed') return;
    }

    if (saddr == '') {
      url = encodeURI(`http://maps.apple.com/?daddr=${daddr}`);
    } else {
      url = encodeURI(`http://maps.apple.com/?saddr=${saddr}&daddr=${daddr}`);
    }
  } else {
    const what3words = argument.match(w3wRegex);

    if (what3words) {
      const cooComp = getCooComp(what3words);
      if (cooComp == 'failed') return;
      url = `http://maps.apple.com/?q=///${encodeURIComponent(
        what3words
      )}&ll=${cooComp}&z=10&t=s`;
    } else {
      url = `https://maps.apple.com/?q=${encodeURI(argument)}`;
    }
  }

  LaunchBar.openURL(url);
}

function getCooComp(what3words) {
  if (!apiKey) return setApiKey();

  const requestURL = `https://api.what3words.com/v3/convert-to-coordinates?words=${what3words}&key=${apiKey}`;
  const result = HTTP.getJSON(requestURL);

  if (!result.response) {
    LaunchBar.alert(result.error);
    return 'failed';
  }

  if (result.response.status != 200) {
    LaunchBar.alert(
      `${result.response.status}: ${result.response.localizedStatus}`
    );
    return 'failed';
  }

  const coo = result.data.coordinates;
  return `${coo.lat},${coo.lng}`;
}

function setApiKey() {
  const response = LaunchBar.alert(
    'API key required',
    '1) Press "Open Website" to create an API key.\n2) Press "Set API key"',
    'Open Website',
    'Set API key',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.openURL('https://developer.what3words.com/public-api');
      LaunchBar.hide();
      break;
    case 1:
      const clipboardContent = LaunchBar.getClipboardString().trim();

      if (clipboardContent.length == 8) {
        // Write new API key in Action preferences
        Action.preferences.apiKey = clipboardContent;

        LaunchBar.alert(
          'Success!',
          `API key set to: ${Action.preferences.apiKey}`
        );
      } else {
        LaunchBar.alert(
          'The length of the clipboard content does not match the length of a correct API key',
          'Make sure the API key is the most recent item in the clipboard!'
        );
      }
      break;
    case 2:
      break;
  }
}
