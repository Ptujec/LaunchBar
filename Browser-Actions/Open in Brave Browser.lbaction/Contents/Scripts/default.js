/* 
Open in Brave Browser Action for LaunchBar
by Christian Bender (@ptujec)
2025-06-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

const target = 'com.brave.Browser';

function run() {
  if (LaunchBar.options.alternateKey) return settings();

  const closeSetting = Action.preferences.close || false;

  const appInfo = LaunchBar.execute('/bin/bash', './appInfo.sh')
    .trim()
    .split('\n');

  const frontmost = appInfo[0];
  const appName = appInfo[1];
  const isSupported = appInfo[2] === 'true';

  if (!isSupported) {
    LaunchBar.alert(appName + ' is not a supported browser!'.localize());
    return;
  }

  if (frontmost === target) {
    LaunchBar.alert('This is '.localize() + appName + '!');
    return;
  }

  LaunchBar.hide();

  if (
    frontmost === 'com.brave.Browser' ||
    frontmost === 'com.google.Chrome' ||
    frontmost === 'company.thebrowser.Browser' ||
    frontmost === 'com.vivaldi.Vivaldi'
  ) {
    const url = getURLChromium(frontmost);
    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeChromium(frontmost);
    }
  } else if (frontmost === 'com.apple.Safari') {
    const url = getURLSafari();
    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeSafari();
    }
  } else if (
    frontmost === 'org.mozilla.firefox' ||
    frontmost === 'app.zen-browser.zen'
  ) {
    const url = getURLFirefox(frontmost);
    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeFirefox(frontmost);
    }
  }
}

// MARK: - Settings

function settings() {
  let title, icon, arg;

  if (Action.preferences.close !== true) {
    title = "Don't close original site".localize();
    icon = 'xOffTemplate';
    arg = { close: true };
  } else {
    title = 'Close original site'.localize();
    icon = 'xTemplate';
    arg = { close: false };
  }

  return [
    {
      title,
      action: 'closeToggle',
      actionArgument: arg,
      icon,
    },
  ];
}

function closeToggle({ close }) {
  Action.preferences.close = close;
  return settings();
}

// MARK: - AppleScript

function getURLSafari() {
  return LaunchBar.executeAppleScript(
    `
    tell application id "com.apple.Safari"
      if exists URL of current tab of window 1 then
        set vURL to URL of current tab of window 1
      end if
    end tell
  `
  )?.trim();
}

function getURLFirefox(frontmost) {
  LaunchBar.executeAppleScript(`
    tell application id "${frontmost}" to activate
    delay 0.2
    tell application "System Events"
      keystroke "l" using {command down}
      delay 0.2
      keystroke "c" using {command down}
      delay 0.2
      key code 53
    end tell
    delay 0.2
  `);
  return LaunchBar.getClipboardString();
}

function getURLChromium(frontmost) {
  return LaunchBar.executeAppleScript(
    `
    tell application id "${frontmost}"
      if (count windows) ≠ 0 then
        set vURL to URL of active tab of window 1
      end if
    end tell
  `
  )?.trim();
}

function closeSafari() {
  LaunchBar.executeAppleScript(`
    tell application id "com.apple.Safari"
      close current tab of window 1
      delay 0.1
      if (count documents) = 0 then
        quit application "Safari"
      end if
    end tell
  `);
}

function closeFirefox(frontmost) {
  LaunchBar.executeAppleScript(`
    tell application id "${frontmost}"
      close front window
      delay 0.2
      set _count to count windows
      if _count < 4 then
        quit
      end if
    end tell
  `);
}

function closeChromium(frontmost) {
  LaunchBar.executeAppleScript(`
    tell application id "${frontmost}"
      close active tab of window 1
      delay 0.5
      if (count of windows) = 0 then
        quit
      else if (count of windows) = 1 then
        if title of window 1 begins with "Space" then
          quit
        else if title of window 1 is "Neuer Tab" then
          quit
        else if title of window 1 is "New Tab" then
          quit
        end if
      end if
    end tell
  `);
}
