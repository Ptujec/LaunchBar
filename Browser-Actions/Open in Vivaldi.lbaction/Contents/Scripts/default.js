/* 
Open in Vivaldi Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

const target = 'Vivaldi';
const supportedBrowers = [
  'Brave Browser',
  'Safari',
  'Vivaldi',
  'Google Chrome',
  'firefox',
  'Arc',
];

function run() {
  // Close (and Quit) Settings
  if (LaunchBar.options.shiftKey) {
    var output = settings();
    return output;
  }

  if (Action.preferences.close == undefined) {
    var closeSetting = false; // default
  } else {
    var closeSetting = Action.preferences.close;
  }

  // Get frontmost app
  var frontmost = LaunchBar.executeAppleScript(
    'tell application "System Events" to set _frontmoste to name of application processes whose frontmost is true as string'
  ).trim();

  // Check if frontmost is target
  if (frontmost == target) {
    LaunchBar.alert('This is '.localize() + target + '!');
    return;
  }

  // Check if browser is supported
  if (!supportedBrowers.includes(frontmost)) {
    LaunchBar.alert(frontmost + ' is not a supported browser!'.localize());
    return;
  }

  // Hide LaunchBar interface since is needed from here
  LaunchBar.hide();

  // Open URL in target brower and close it in source browser if set up in settings (default is false)
  if (frontmost == 'Brave Browser') {
    var url = getURLBrave();
    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeBrave();
    }
  } else if (frontmost == 'Safari') {
    var url = getURLSafari();
    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeSafari();
    }
  } else if (frontmost == 'Google Chrome') {
    var url = getURLChrome();
    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeChrome();
    }
  } else if (frontmost == 'Arc') {
    var url = getURLArc();
    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeArc();
    }
  } else if (frontmost == 'Vivaldi') {
    var url = getURLVivaldi();
    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeVivaldi();
    }
  } else if (frontmost == 'firefox') {
    var url = getURLFirefox();
    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeFirefox();
    }
  }
}

// Setting Functions
function settings() {
  if (Action.preferences.close != true) {
    titel = "Don't close original site".localize();
    icon = 'xOffTemplate';
    arg = 'true';
  } else {
    titel = 'Close original site'.localize();
    icon = 'xTemplate';
    arg = 'false';
  }

  return [
    {
      title: titel,
      action: 'closeToggle',
      actionArgument: arg,
      icon: icon,
    },
  ];
}

function closeToggle(arg) {
  if (arg == 'true') {
    Action.preferences.close = true;
  } else {
    Action.preferences.close = false;
  }

  var output = settings();
  return output;
}

// Get URL Functions
function getURLBrave() {
  var url = LaunchBar.executeAppleScript(
    'tell application "Brave Browser"',
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

function getURLVivaldi() {
  var url = LaunchBar.executeAppleScript(
    'tell application "Vivaldi"',
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

function getURLChrome() {
  var url = LaunchBar.executeAppleScript(
    'tell application "Google Chrome"',
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

function getURLArc() {
  var url = LaunchBar.executeAppleScript(
    'tell application "Arc"',
    '	if windows ≠ {} then',
    '		set vURL to URL of active tab of window 1',
    '	end if',
    'end tell'
  );
  if (url != undefined) {
    url = url.trim();
  }
  return url;
}

// Close Functions
function closeBrave() {
  LaunchBar.executeAppleScript(
    'tell application "Brave Browser"',
    '	close active tab of window 1',
    '	delay 0.5',
    '	if (count windows) = 0 then',
    '		quit',
    '	end if',
    'end tell'
  );
}

function closeVivaldi() {
  LaunchBar.executeAppleScript(
    'tell application "Vivaldi"',
    '	close active tab of window 1',
    '	delay 0.5',
    '	if (count windows) = 0 then',
    '		quit',
    '	end if',
    'end tell'
  );
}

function closeSafari() {
  LaunchBar.executeAppleScript(
    'tell application "Safari"',
    '	close current tab of window 1',
    '	delay 0.1',
    '	if (count documents) = 0 then',
    '		quit application "Safari"',
    '	end if',
    'end tell'
  );
}

function closeChrome() {
  LaunchBar.executeAppleScript(
    'tell application "Google Chrome"',
    '	close active tab of window 1',
    '	delay 0.5',
    '	if (count windows) = 0 then',
    '		quit',
    '	end if',
    'end tell'
  );
}

function closeFirefox() {
  LaunchBar.executeAppleScript(
    'tell application "Firefox"',
    '	close front window',
    '	delay 0.2',
    '	set _count to count windows',
    '	if _count < 4 then',
    '		quit',
    '	end if',
    'end tell'
  );
}

function closeArc() {
  LaunchBar.executeAppleScript(
    'tell application "Arc"',
    '	close active tab of window 1',
    '	delay 0.5',
    '	if (count of windows) = 0 then',
    '		quit application "Arc"',
    '		',
    '	else if (count of windows) = 1 then',
    '		if title of window 1 begins with "Space" then',
    '			quit',
    '		end if',
    '	end if',
    'end tell'
  );
}
