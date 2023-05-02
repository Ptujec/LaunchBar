/* 
  GET URL FUNCTIONS
*/

function getCurrentURL() {
  const supportedBrowers = [
    'Brave Browser',
    'Safari',
    'Vivaldi',
    'Google Chrome',
    'firefox',
    'Arc',
  ];

  // Get frontmost app
  var frontmost = LaunchBar.executeAppleScript(
    'tell application "System Events" to set _frontmoste to name of application processes whose frontmost is true as string'
  ).trim();

  // Check if browser is supported
  if (!supportedBrowers.includes(frontmost)) {
    alertWhenRunningInBackground(frontmost + ' is not a supported browser!');
    return;
  }

  // Open URL in target brower and close it in source browser if set up in settings (default is false)
  if (
    frontmost == 'Brave Browser' ||
    frontmost == 'Google Chrome' ||
    frontmost == 'Arc' ||
    frontmost == 'Vivaldi'
  ) {
    var url = getURLChromium(frontmost);
  } else if (frontmost == 'Safari') {
    var url = getURLSafari();
  } else if (frontmost == 'firefox') {
    var url = getURLFirefox();
  }
  return url;
}

function getURLSafari() {
  var url = LaunchBar.executeAppleScript(
    'tell application "Safari"',
    '	if exists URL of current tab of window 1 then',
    '		set vURL to URL of current tab of window 1',
    '	end if',
    'end tell'
  );
  if (url != undefined) {
    url = url.trim();
  }
  return url;
}

function getURLFirefox() {
  LaunchBar.executeAppleScript(
    'tell application "Firefox" to activate',
    'delay 0.2',
    'tell application "System Events"',
    '	keystroke "l" using {command down}',
    '	delay 0.2',
    '	keystroke "c" using {command down}',
    '	delay 0.2',
    '	key code 53',
    'end tell',
    'delay 0.2'
  );
  var url = LaunchBar.getClipboardString();
  return url;
}

function getURLChromium(frontmost) {
  var url = LaunchBar.executeAppleScript(
    'tell application "' + frontmost + '"',
    '	if (count windows) ≠ 0 then',
    '		set vURL to URL of active tab of window 1',
    '	end if',
    'end tell'
  );
  if (url != undefined) {
    url = url.trim();
  }
  return url;
}
