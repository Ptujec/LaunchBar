/* 
Open in Google Chrome Action for LaunchBar
by Christian Bender (@ptujec)
2026-01-12

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

const target = 'com.google.Chrome';

function run() {
  if (LaunchBar.options.alternateKey) return settings();

  const closeSetting = Action.preferences.close || false;

  const [frontmost, appName, isSupported] = LaunchBar.execute(
    '/bin/bash',
    './appInfo.sh',
  )
    .trim()
    .split('\n');

  if (isSupported === 'false') {
    LaunchBar.alert(appName + ' is not a supported browser!');
    LaunchBar.hide();
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
    frontmost === 'net.imput.helium' ||
    frontmost === 'company.thebrowser.Browser' ||
    frontmost === 'com.vivaldi.Vivaldi'
  ) {
    const url = getURLChromium(frontmost);
    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeChromium(frontmost);
    }
  } else if (
    frontmost === 'com.apple.Safari' ||
    frontmost === 'com.kagi.kagimacOS'
  ) {
    const url = getURLSafari(frontmost);

    LaunchBar.openURL(url, target);

    if (closeSetting == true || LaunchBar.options.commandKey) {
      closeSafari(frontmost);
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

function getURLSafari(frontmost) {
  let [url, time] = LaunchBar.executeAppleScript(
    `
    tell application id "${frontmost}"
      set _url to ""
      set _time to ""
      if exists URL of current tab of window 1 then
        set _url to URL of current tab of window 1
      end if
      if (_url contains "youtube.com") or (_url contains "twitch.tv") then
		    try
			    set _time to (do JavaScript "String(Math.round(document.querySelector('video').currentTime))" in front document) as string
		    on error e
			    -- do nothing
		    end try
	    end if
      return _url & "\n" & _time
    end tell
  `,
  )?.split('\n');

  url =
    parseFloat(time) && url.includes('youtu')
      ? handleYoutubeUrl(url, time)
      : url;
  url =
    parseFloat(time) && url.includes('twitch.tv')
      ? handleTwitchUrl(url, time)
      : url;

  return url;
}

function getURLChromium(frontmost) {
  let [url, time] = LaunchBar.executeAppleScript(
    `
    tell application id "${frontmost}"
      set _url to ""
      set _time to ""
      if (count windows) ≠ 0 then
        set _url to URL of active tab of window 1
      end if
      if (_url contains "youtube.com") or (_url contains "twitch.tv") then
        try
          set _time to (execute active tab of front window javascript "String(Math.round(document.querySelector('video').currentTime))")
        on error e
          -- do nothing
        end try
      end if
      return _url & "\n" & _time  
    end tell
  `,
  )?.split('\n');

  url =
    parseFloat(time) && url.includes('youtu')
      ? handleYoutubeUrl(url, time)
      : url;
  url =
    parseFloat(time) && url.includes('twitch.tv')
      ? handleTwitchUrl(url, time)
      : url;

  return url;
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

function closeSafari(frontmost) {
  LaunchBar.executeAppleScript(`
    tell application id "${frontmost}"
      close current tab of window 1
      delay 0.1
      if (count documents) = 0 then
        quit application id "${frontmost}"
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

function handleYoutubeUrl(url, time) {
  // LaunchBar.log(`Handling YouTube URL: ${url} with time: ${time}`);

  const baseUrl = 'https://www.youtube.com/watch?v=';

  let ytId;

  if (url.includes('/shorts/')) return url;

  if (url.includes('youtu.be')) {
    ytId = url.split('youtu.be/')[1]?.split('?')[0];
  } else {
    ytId = url.split('v=')[1]?.split('&')[0];
  }

  if (!ytId) return url;

  url =
    `${baseUrl}${ytId}` +
    ((time && parseFloat(time)) > 10 ? `&t=${time}s` : '');

  return url;
}

function handleTwitchUrl(url, time) {
  // LaunchBar.log(`Handling Twitch URL: ${url} with time: ${time}`);

  const baseUrl = 'https://www.twitch.tv/videos/';

  const videoIdMatch = url.match(/\/videos\/(\d+)/);
  if (!videoIdMatch) return url;

  const videoId = videoIdMatch[1];

  url =
    `${baseUrl}${videoId}` +
    ((time && parseFloat(time)) > 10 ? `?t=${time}s` : '');

  return url;
}
