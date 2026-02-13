/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Wait for modifier key to be released before running AppleScript:
https://stackoverflow.com/questions/36822613/wait-until-any-key-is-held-in-applescript
*/

String.prototype.localizationTable = 'default';

include('global.js');
include('localization.js');
include('setKey.js');

function runWithString(string) {
  if (apiToken == undefined) {
    setApiKey();
    return;
  }

  if (string && Action.preferences.updateNow) {
    // this is set to true every time you use command to set a project, label, or section … so the next time this will check once for updates … but initialy it won't … the initial update will be triggered when using command the first time
    update(false); // false = don't hide LaunchBar
    Action.preferences.updateNow = false;
    LaunchBar.log('Updating local data…');
  }

  if (string === '.') return getAppLinks();
  if (string === ',') return getClipboard();
  if (string.split('"').length === 2) return handleQuotes(string);
  if (string.includes('{') && !string.includes('}')) return expandCurlyBraces();

  return main(string);
}

// MARK: - Feature Functions

function getAppLinks() {
  const [appId, appName, isSupportedBrowser] = LaunchBar.execute(
    '/bin/bash',
    './appInfo.sh',
  )
    .trim()
    .split('\n');

  let output;

  if (appId === 'com.apple.mail') {
    output = LaunchBar.executeAppleScriptFile('./mail.applescript').trim();

    if (output !== '') {
      const result = eval(`[${output}]`).sort((a, b) => a.date < b.date);

      if (result.length > 1) {
        return result;
      }

      if (result.length === 1) {
        const subject = cleanupTitle(result[0].subject);
        const messageURL = result[0].messageURL;
        pasteLink(`[${subject}](${messageURL})`);
        return;
      }
    }

    return {
      title: 'No email selected!'.localize(),
      icon: 'alert',
    };
  }

  if (isSupportedBrowser === 'true') {
    const info = getBrowserInfo(appId).trim().split('\n');

    let url = info[0]?.trim();
    const title = info[1] ? cleanupTitle(info[1]) : url;
    const time = info[2] ? info[2].trim() : null;

    if (!url || url === '') {
      return {
        title: 'No URL found in '.localize() + appName + '!',
        icon: 'alert',
      };
    }

    let ytId, twitchId;
    if (url.includes('youtu')) {
      [url, ytId] = handleYoutubeUrl(url, time);
    }
    if (url.includes('twitch.tv')) {
      [url, twitchId] = handleTwitchUrl(url, time);
    }

    pasteLink(`[${title}](${url})`);

    return;
  }

  if (!output) {
    return {
      title:
        'No links. '.localize() +
        appName +
        ' is not a supported application!'.localize(),
      icon: 'alert',
    };
  }
}

function getClipboard() {
  let currentClipboard = LaunchBar.getClipboardString();

  if (!currentClipboard) {
    return {
      title: 'No clipboard entry found!'.localize(),
      icon: 'alert',
    };
  }

  let newClipboard = currentClipboard;
  let moveAS = '';
  let restoreClipboardAS = '';

  if (!currentClipboard.startsWith('[')) {
    if (currentClipboard.includes('://')) {
      newClipboard = `[](${currentClipboard})`;

      if (currentClipboard.includes('teams.microsoft')) {
        newClipboard = `[](${currentClipboard.replace(/https?/, 'msteams')})`;
      }

      LaunchBar.setClipboardString(newClipboard);

      moveAS = `key code 123 using command down\nkey code 124\n`;
      restoreClipboardAS = `set the clipboard to "${currentClipboard}"`;
    }
  } else {
    moveAS = `key code 123 using command down\nkey code 124\n`;
  }

  const pasteClipboardAS = `
    tell application "System Events"
      keystroke "a" using command down
      delay 0.2
      keystroke "v" using command down
      ${moveAS}
    end tell
    ${restoreClipboardAS}
  `;

  LaunchBar.executeAppleScript(pasteClipboardAS);
}

function handleQuotes(string) {
  // some hacky stuff in here to get this to work
  const currentClipboard = LaunchBar.getClipboardString() || '';

  LaunchBar.setClipboardString(
    string === '"' ? '""' : `"${string.replace(/"/g, '').trim()}"`,
  );

  const moveCursor = string === '"' ? 'key code 123' : '';
  const handleQuotesAS = `
    use scripting additions
    use framework "Foundation"
    
    property NSShiftKeyMask : a reference to 131072
    property NSEvent : a reference to current application's NSEvent
    
    on run ()
    	set modifier_down to true
    	repeat while modifier_down
    		set modifier_flags to NSEvent's modifierFlags()
    		set shift_down to ((modifier_flags div (get NSShiftKeyMask)) mod 2) = 1
    		set modifier_down to shift_down
    	end repeat
    	
    	tell application "System Events"
    		keystroke "a" using command down
    		delay 0.05
    		keystroke "v" using command down
    		delay 0.05
    		${moveCursor}
    	end tell
    	
    	set the clipboard to "${currentClipboard}"
    end run
  `;

  LaunchBar.executeAppleScript(handleQuotesAS);
}

function expandCurlyBraces() {
  LaunchBar.executeAppleScript(`
    tell application "System Events"  
      keystroke "}"
      key code 123
    end tell
  `);
}

// MARK: - App Links Helper Functions

function getBrowserInfo(appId) {
  const script =
    appId == 'com.apple.Safari' || appId == 'com.kagi.kagimacOS'
      ? `
    tell application id "${appId}"
        set _url to URL of front document
        set _name to name of front document
        set _time to ""
        if (_url contains "youtube.com") or (_url contains "twitch.tv") then
          try
              set _time to (do JavaScript "String(Math.round(document.querySelector('video').currentTime))" in front document) as string
          on error e
              -- do nothing
          end try
        end if
        return _url & "\n" & _name & "\n" & _time
    end tell`
      : `
    tell application id "${appId}"
        set _url to URL of active tab of front window
        set _name to title of active tab of front window
        set _time to ""
        if (_url contains "youtube.com") or (_url contains "twitch.tv") then
          try
            set _time to (execute active tab of front window javascript "String(Math.round(document.querySelector('video').currentTime))")
          on error e
            -- do nothing
          end try
        end if
        return _url & "\n" & _name & "\n" & _time
    end tell`;

  return LaunchBar.executeAppleScript(script).trim();
}

function handleYoutubeUrl(url, time) {
  // LaunchBar.log(`Handling YouTube URL: ${url} with time: ${time}`);

  const baseUrl = 'https://www.youtube.com/watch?v=';

  let ytId;

  if (url.includes('youtu.be')) {
    ytId = url.split('youtu.be/')[1]?.split('?')[0];
  } else {
    ytId = url.split('v=')[1]?.split('&')[0];
  }

  if (!ytId) return [url, ytId];

  url =
    `${baseUrl}${ytId}` +
    ((time && parseFloat(time)) > 10 ? `&t=${time}s` : '');

  return [url, ytId];
}

function handleTwitchUrl(url, time) {
  // LaunchBar.log(`Handling Twitch URL: ${url} with time: ${time}`);

  const baseUrl = 'https://www.twitch.tv/videos/';

  const videoIdMatch = url.match(/\/videos\/(\d+)/);
  if (!videoIdMatch) return [url, null];

  const videoId = videoIdMatch[1];

  url =
    `${baseUrl}${videoId}` +
    ((time && parseFloat(time)) > 10 ? `?t=${time}s` : '');

  return [url, videoId];
}

function cleanupTitle(title) {
  if (!title) return '';
  return title
    .decodeHTMLEntities()
    .replace(/^\(\d+\)/g, '') // remove tab number prefix like "(1) "
    .replace(/:/g, '-') // remove tab number prefix like "(1) "
    .replace(' - YouTube', '')
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim();
}

function pasteLink(mdLink) {
  let currentClipboard = LaunchBar.getClipboardString();

  LaunchBar.setClipboardString(mdLink);

  const pasteClipboardAS = `
    tell application "System Events"
      keystroke "a" using command down
      delay 0.2
      keystroke "v" using command down
      key code 123 using command down
      key code 124
    end tell
    set the clipboard to "${currentClipboard}"
  `;

  LaunchBar.executeAppleScript(pasteClipboardAS);
}

// MARK: - Main Function

function main(string) {
  let suggestions = [];
  let quotedParts, show, dueExists, p, icon;

  // Exclude parts in quotation marks from being parsed
  if (string.includes('"')) {
    quotedParts = (string.match(reQuotedParts) || [])
      .map((part) => part.slice(1, -1))
      .join(' ');
    string = string.replace(reQuotedParts, ' ');

    if (quotedParts) {
      show = true;
    }
  }

  // Reminder
  if (string.includes(' !')) {
    show = true;
    let reminder = string.match(reReminder)[1];

    suggestions = [
      ...suggestions,
      {
        title: reminder,
        icon: 'reminderTemplate',
        order: 7,
      },
    ];
    string = string.replace(reReminder, '');
  }

  // Description
  if (string.includes(': ')) {
    show = true;
    let description = string.match(reDescription)[1];

    suggestions = [
      ...suggestions,
      {
        title: capitalizeFirstLetter(description),
        icon: 'descriptionTemplate',
        order: 2,
      },
    ];
    string = string.replace(reDescription, '');
  }

  // Priorities
  if (rePrio.test(string)) {
    if (string.includes('p1')) {
      p = 'Priority 1'.localize();
      icon = 'redFlag';
    } else if (string.includes('p2')) {
      p = 'Priority 2'.localize();
      icon = 'orangeFlag';
    } else if (string.includes('p3')) {
      p = 'Priority 3'.localize();
      icon = 'blueFlag';
    } else {
      p = undefined;
    }
    string = string.replace(rePrio, ' ');
  }

  if (p) {
    show = true;
    suggestions = [
      ...suggestions,
      {
        title: p,
        icon: icon,
        order: 6,
      },
    ];
  }

  // Due String
  // - with @ (should work for most cenarios except for "@date <title>")
  if (string.includes(' @')) {
    show = true;
    dueExists = true;
    suggestions = [
      ...suggestions,
      {
        title: string.match(reDueStringWithAt)[1],
        icon: 'dueTemplate',
        order: 3,
      },
    ];
    string = string.replace(reDueStringWithAt, '$2');
  } else {
    let due = [];
    for (dueStringOption of dueStringOptions) {
      const reDueString = new RegExp(`(^| )${dueStringOption}(\$| )`, 'i');
      if (reDueString.test(string)) {
        due.push(string.match(reDueString)[0].trim());
        string = string.replace(reDueString, ' ');
      }
    }
    if (due.length > 0) {
      show = true;
      dueExists = true;

      suggestions = [
        ...suggestions,
        {
          title: due.join(' '),
          icon: 'dueTemplate',
          order: 3,
        },
      ];
    }
  }

  // Deadline
  if (string.includes('{')) {
    const deadlineMatch = string.match(reDeadline);
    if (deadlineMatch) {
      const parsedDate = parseDeadlineDate(deadlineMatch[1]);
      if (parsedDate) {
        show = true;
        suggestions = [
          ...suggestions,
          {
            title: LaunchBar.formatDate(new Date(parsedDate), {
              relativeDateFormatting: true,
              timeStyle: 'none',
            }),
            icon: 'deadlineTemplate',
            order: 5,
          },
        ];
      }
      string = string.replace(reDeadline, ' ');
    }
  }

  // Duration (duration regex is defined in locations.js)
  if (reDuration.test(string)) {
    show = true;

    if (!dueExists) {
      suggestions = [
        ...suggestions,
        {
          title: 'Now'.localize(),
          icon: 'dueTemplate',
          order: 3,
        },
      ];
    }

    const duration = string.match(reDuration)[0].trim();

    suggestions = [
      ...suggestions,
      {
        title: duration,
        icon: 'durationTemplate',
        order: 4,
      },
    ];
    string = string.replace(reDuration, ' ');
  }

  // Add quoted string parts
  string = quotedParts ? `${quotedParts}${string}` : string;

  if (show == true) {
    suggestions = [
      ...suggestions,
      {
        title: capitalizeFirstLetter(string.trim()),
        icon: 'titleTemplate',
        order: 1,
      },
    ];

    return suggestions.sort((a, b) => a.order > b.order);
  }
}
