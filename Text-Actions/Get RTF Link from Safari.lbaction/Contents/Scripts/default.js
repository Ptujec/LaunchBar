/* 
Get RTF Link Action for LaunchBar
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
    var bothBrowserAS = chromiumBasedBothAS;
    var urlBrowserAS = chromiumBasedUrlAS;
  } else if (defaultBrowser == 'com.apple.safari') {
    var bothBrowserAS = safariBothAS;
    var urlBrowserAS = safariUrlAS;
  } else {
    LaunchBar.alert(defaultBrowser + ' not supported');
    return;
  }

  if (argument == undefined) {
    var browserAS = bothBrowserAS;
  } else {
    var browserAS = urlBrowserAS + '\n    set _name to "' + argument + '" \n';
  }

  // Entire AS
  var appleScript =
    'try\n' +
    browserAS +
    '	set _html to "<font size=\\"4\\"><font face=\\"helvetica neue\\"><a href=\\"" & _url & "\\">" & _name & "</a> </font></font>"\n' +
    '	do shell script "echo " & quoted form of _html & "|textutil -inputencoding UTF-8 -format html  -convert rtf -stdin -stdout|LC_CTYPE=UTF-8 pbcopy"\n' +
    '	delay 0.1\n' +
    '	tell application "System Events"\n' +
    '		keystroke "v" using command down\n' +
    '	end tell\n' +
    'on error e\n' +
    '	display dialog e\n' +
    'end try';

  // Execute AS
  LaunchBar.executeAppleScript(appleScript);
}
