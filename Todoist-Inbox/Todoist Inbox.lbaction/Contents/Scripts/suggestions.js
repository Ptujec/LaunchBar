/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
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

  return eval('[' + output + ']').sort((a, b) => a.date < b.date);
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
  let clipboardAS = '';

  if (!currentClipboard.startsWith('[')) {
    if (currentClipboard.includes('://')) {
      newClipboard = `[](${currentClipboard})`;

      if (currentClipboard.includes('teams.microsoft')) {
        newClipboard = `[](${currentClipboard.replace(/https?/, 'msteams')})`;
      }

      moveAS = 'key code 123 using command down\n' + 'key code 124\n';
      clipboardAS = `set the clipboard to "${currentClipboard}"`;
      LaunchBar.setClipboardString(newClipboard);
    }
  } else {
    moveAS = 'key code 123 using command down\n' + 'key code 124\n';
  }

  LaunchBar.executeAppleScript(
    'tell application "System Events"\n' +
      'keystroke "a" using command down\n' +
      'keystroke "v" using command down\n' +
      moveAS +
      'end tell\n' +
      'delay 0.1\n' +
      clipboardAS
  );
}

function main(string) {
  // Main Action
  let suggestions = [];
  let quotedParts, show, dueExists, p, icon;

  // Description
  if (string.includes(': ')) {
    show = true;
    let description = string.match(reDescription)[1];

    suggestions.push({
      title: capitalizeFirstLetter(description),
      icon: 'descriptionTemplate',
      order: 2,
    });
    string = string.replace(reDescription, '');
  }

  // Exclude parts in quotation marks from being parsed
  if (string.includes('"')) {
    quotedParts = (string.match(reQuotedParts) || [])
      .map((part) => part.slice(1, -1))
      .join(' ');
    string = string.replace(reQuotedParts, ' ');
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
    suggestions.push({
      title: p,
      icon: icon,
      order: 5,
    });
  }

  // Due String
  // - with @ (should work for most cenarios except for "@date <title>")

  if (string.includes(' @')) {
    show = true;
    dueExists = true;
    suggestions.push({
      title: string.match(reDueStringWithAt)[1],
      icon: 'dueTemplate',
      order: 2,
    });
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

      suggestions.push({
        title: due.join(' '),
        icon: 'dueTemplate',
        order: 3,
      });
    }
  }

  // Duration (duration regex is defined in locations.js)
  if (reDuration.test(string)) {
    show = true;

    if (!dueExists) {
      suggestions.push({
        title: 'Now'.localize(),
        icon: 'dueTemplate',
        order: 3,
      });
    }

    const duration = string.match(reDuration)[0].trim();

    suggestions.push({
      title: duration,
      icon: 'durationTemplate',
      order: 4,
    });
    string = string.replace(reDuration, ' ');
  }

  // Add quoted string parts
  string = quotedParts ? quotedParts + string : string;

  if (show == true) {
    suggestions.push({
      title: capitalizeFirstLetter(string.trim()),
      icon: 'titleTemplate',
      order: 1,
    });

    return suggestions.sort((a, b) => a.order > b.order);
  }
}
