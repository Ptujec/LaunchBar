/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-01

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('constants.js');
include('localization.js');
include('setKey.js');

function runWithString(string) {
  if (apiToken == undefined) {
    setApiKey();
    return;
  }
  if (string.startsWith('.')) {
    return getMarkdownLinks();
  }
  return main(string);
}

function getMarkdownLinks() {
  // Get Markdown Links from Mail and Safari
  var output = LaunchBar.executeAppleScriptFile('./mdLinks.applescript').trim();

  if (output != '_') {
    const parts = output.split('_');
    let suggestions = [];

    if (parts[0]) {
      const mail = parts[0].split('\n');

      for (line of mail) {
        if (line) {
          let [title, subtitle] = line.split('--');
          suggestions.push({
            title: title.trim(),
            subtitle: subtitle,
            icon: 'com.apple.mail',
          });
        }
      }
    }

    if (parts[1]) {
      suggestions.push({
        title: parts[1],
        icon: 'com.apple.safari',
      });
    }

    return suggestions;
  }
}

function main(string) {
  // Main Action
  let suggestions = [];
  let show, p, icon;

  // Priorities

  if (/(p[1-3] )|( p[1-3])/.test(string)) {
    if (string.includes('p1')) {
      p = p1;
      icon = 'redFlag';
    } else if (string.includes('p2')) {
      p = p2;
      icon = 'orangeFlag';
    } else if (string.includes('p3')) {
      p = p3;
      icon = 'blueFlag';
    } else {
      p = undefined;
    }
    string = string.replace(/(p[1-3] )|( p[1-3])/, '');
  }

  // Due/date String
  // with @ (should work for most cenarios except for "@date <title>")
  if (string.includes(' @')) {
    show = true;
    const due = string.match(/ @(.*?)(p\d|((^| )#($| ))|$)/)[1];
    suggestions.push({
      title: due,
      icon: 'calTemplate',
      order: 2,
    });
    string = string.replace(/ @(.*?)(p\d|((^| )#($| ))|$)/, '$2');
  } else {
    // dateStrings
    for (dateString of dateStrings) {
      const re = new RegExp('(^| )' + dateString + '($| )', 'i');
      if (re.test(string)) {
        show = true;
        const dateTitle = string.match(re)[0].trim();
        suggestions.push({
          title: dateTitle,
          icon: 'calTemplate',
          order: 3,
        });
        string = string.replace(re, ' ');
      }
    }
  }

  // Description
  if (string.includes(': ')) {
    show = true;
    let description = string.match(/(?:\: )(.*)/)[1];

    description = description.charAt(0).toUpperCase() + description.slice(1);

    suggestions.push({
      title: description,
      icon: 'descriptionTemplate',
      order: 2,
    });
    string = string.replace(/(?:\: )(.*)/, '');
  }

  if (p) {
    show = true;
    suggestions.push({
      title: p,
      icon: icon,
      order: 4,
    });
  }

  if (show == true) {
    string = string.trim();
    string = string.charAt(0).toUpperCase() + string.slice(1);

    suggestions.push({
      title: string,
      icon: 'titleTemplate',
      order: 1,
    });

    suggestions.sort(function (a, b) {
      return a.order > b.order;
    });
    return suggestions;
  }
}
