/* 
PodQueue Action for LaunchBar
by Christian Bender (@ptujec)
2024-11-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const chromiumBrowsers = [
  'company.thebrowser.browser',
  'com.google.chrome',
  'com.vivaldi.vivaldi',
  'com.brave.browser',
];

const supportedBrowsers = [...chromiumBrowsers, 'com.apple.Safari'];

function getBrowser() {
  const frontmost = getFrontmostApp().toLowerCase();

  return supportedBrowsers.includes(frontmost)
    ? frontmost
    : getDefaultBrowser();
}

function getFrontmostApp() {
  return LaunchBar.executeAppleScript(
    'tell application "System Events" to set _frontmoste to bundle identifier of application processes whose frontmost is true as string'
  ).trim();
}

function getDefaultBrowser() {
  const lsHandlers = File.readPlist(
    '~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist'
  ).LSHandlers;

  return (
    lsHandlers
      .find((item) => item.LSHandlerURLScheme === 'http')
      .LSHandlerRoleAll.toLowerCase() || ''
  );
}

function getURL(browser) {
  const safariAS =
    'tell application id "com.apple.Safari" to set _url to URL of front document';

  const chromiumBasedAS =
    'tell application id "' +
    browser +
    '" to set _url to URL of active tab of front window';

  return browser === 'com.apple.safari'
    ? LaunchBar.executeAppleScript(safariAS).trim()
    : chromiumBrowsers.includes(browser)
    ? LaunchBar.executeAppleScript(chromiumBasedAS).trim()
    : LaunchBar.alert(`${browser} not supported`);
}
