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
  if (string === '.') return getAppLinks();
  if (string === ',') return getClipboard();
  if (string.split('"').length === 2) return handleQuotes(string);
  return main(string);
}

function getAppLinks() {
  // Get Markdown Links from Mail and Safari
  const output = LaunchBar.executeAppleScriptFile(
    './mdLinks.applescript'
  ).trim();

  if (output == '') {
    return {
      title: 'No links to emails or websites found!'.localize(),
      icon: 'alert',
    };
  }

  return eval(`[${output}]`).sort((a, b) => a.date < b.date);
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
    string === '"' ? '""' : `"${string.replace(/"/g, '').trim()}"`
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
        order: 5,
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
        order: 2,
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
