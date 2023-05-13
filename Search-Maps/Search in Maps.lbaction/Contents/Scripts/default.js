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
  argument = argument + ' ';

  var parts = argument.split(/(?: |^)(?:to|nach|von|from) /);
  var devider = argument.match(/(?: |^)(?:to|nach|von|from) /);

  if (devider != undefined) {
    devider = devider.join('').trim();

    if (devider == 'von' || devider == 'from') {
      var saddr = parts[1]; // source address
      var daddr = parts[0]; // destination add
    } else {
      var saddr = parts[0]; // source address
      var daddr = parts[1]; // destination address
    }

    if (w3wRegex.test(daddr)) {
      daddr = getCooComp(daddr.match(w3wRegex)[0]);
    }

    if (w3wRegex.test(saddr)) {
      saddr = getCooComp(saddr.match(w3wRegex)[0]);
    }

    if (saddr == '') {
      var url = encodeURI('http://maps.apple.com/?daddr=' + daddr);
    } else {
      var url = encodeURI(
        'http://maps.apple.com/?saddr=' + saddr + '&daddr=' + daddr
      );
    }
  } else {
    const what3words = argument.match(w3wRegex);

    if (what3words) {
      var cooComp = getCooComp(what3words);
      var url =
        'http://maps.apple.com/?q=///' +
        encodeURIComponent(what3words) +
        '&ll=' +
        cooComp +
        '&z=10&t=s';
    } else {
      var url = 'https://maps.apple.com/?q=' + encodeURI(argument);
    }
  }

  LaunchBar.openURL(url);
}

function getCooComp(what3words) {
  if (apiKey == undefined || LaunchBar.options.commandKey) {
    setApiKey();
    return;
  }

  var requestURL =
    'https://api.what3words.com/v3/convert-to-coordinates?words=' +
    encodeURIComponent(what3words) +
    '&key=' +
    apiKey;

  var result = HTTP.getJSON(requestURL);

  // ERROR HANDLING
  if (result.response == undefined) {
    LaunchBar.alert(result.error);
    return;
  }

  if (result.response.status != 200) {
    LaunchBar.alert(
      result.response.status + ': ' + result.response.localizedStatus
    );
    return;
  }

  var coo = result.data.coordinates;
  var cooComp = coo.lat + ',' + coo.lng;

  return cooComp;
}

function setApiKey() {
  var response = LaunchBar.alert(
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
      var clipboardContent = LaunchBar.getClipboardString().trim();

      if (clipboardContent.length == 8) {
        // Write new API key in Action preferences
        Action.preferences.apiKey = clipboardContent;

        LaunchBar.alert(
          'Success!',
          'API key set to: ' + Action.preferences.apiKey
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
