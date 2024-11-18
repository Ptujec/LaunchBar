/* 
Get Markdown Link Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  // Get info about default browser
  var plist = File.readPlist(
    '~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist'
  );

  var lsHandlers = plist.LSHandlers;
  var defaultBrowser = '';

  lsHandlers.forEach(function (item) {
    if (item.LSHandlerURLScheme == 'http') {
      defaultBrowser = item.LSHandlerRoleAll.toLowerCase();
    }
  });

  // Browser specific AppleScript
  const safariBothAS =
    'tell application id "com.apple.Safari"\n' +
    '	set _url to URL of front document\n' +
    '	set _name to name of front document\n' +
    'end tell\n';
  const safariUrlAS =
    'tell application id "com.apple.Safari" to set _url to URL of front document';

  const chromiumBasedBothAS =
    'tell application id "' +
    defaultBrowser +
    '"\n' +
    '	set _url to URL of active tab of front window\n' +
    '	set _name to title of active tab of front window\n' +
    'end tell\n';

  const chromiumBasedUrlAS =
    'tell application id "' +
    defaultBrowser +
    '" to set _url to URL of active tab of front window';

  // Set AS according to browser
  if (
    defaultBrowser == 'company.thebrowser.browser' ||
    defaultBrowser == 'com.google.chrome' ||
    defaultBrowser == 'com.vivaldi.vivaldi' ||
    defaultBrowser == 'com.brave.browser'
  ) {
    var bothAS = chromiumBasedBothAS;
    var urlAS = chromiumBasedUrlAS;
  } else if (defaultBrowser == 'com.apple.safari') {
    var bothAS = safariBothAS;
    var urlAS = safariUrlAS;
  } else {
    LaunchBar.alert(defaultBrowser + ' not supported');
    return;
  }

  // Get MD Link from default browser
  if (argument == undefined) {
    var m = LaunchBar.executeAppleScript(bothAS + 'return _url & "\n" & _name')
      .trim()
      .split('\n');
    var url = m[0];
    var title = m[1];
  } else {
    var title = argument;
    var url = LaunchBar.executeAppleScript(urlAS).trim();
  }

  var mdLink = '[' + title + '](' + url + ')';
  LaunchBar.paste(mdLink);
}
