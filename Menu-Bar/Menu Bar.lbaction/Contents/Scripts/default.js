/* 
Menu Bar Items (powered by Finbar) Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const finbarCLI = '/Applications/Finbar.app/Contents/MacOS/finbar-cli';

function run() {
  var list = JSON.parse(LaunchBar.execute(finbarCLI, 'list'));

  var recentItems = Action.preferences.recentItems;

  var recentUIDs = [];
  if (recentItems != undefined) {
    recentItems.forEach(function (item) {
      recentUIDs.push(item.bundleID + '.' + item.indices.join('.'));
    });
  }

  var resultRecent = [];
  var resultAll = [];

  list.forEach(function (item) {
    var uID = item.bundleID + '.' + item.indices.join('.');
    var sub = item.path.join(' > ');
    var title = item.title;

    if (item.mark != undefined) {
      title = title + ' ' + item.mark;
    }

    if (
      // This if statement is just for as long as there is not flag in the CLI to apply Finbar rules
      item.indices[0] != 0 &&
      !item.path.includes('Open Recent') &&
      !item.path.includes('Benutzte Dokumente') &&
      !item.path.includes('Verlauf') &&
      !item.path.includes('History') &&
      !item.path.includes('Services') &&
      !item.path.includes('Dienste')
    ) {
      var pushData = {
        title: title,
        subtitle: sub,
        icon: item.bundleID,
        action: 'click',
        actionArgument: {
          bundleID: item.bundleID,
          indices: item.indices,
          title: item.title,
        },
        actionRunsInBackground: true,
      };

      if (item.shortcut != undefined) {
        // A thin space character (U+2009) is added between every character in the keyboard shortcut to mimic the menubar appearance and make the shortcut easier to read.
        pushData.badge = item.shortcut.replace(/([⌘⇧⌃⌥])/g, '$1 ');
      }

      // Priorize recent items
      if (recentUIDs.includes(uID)) {
        resultRecent.push(pushData);
      } else {
        resultAll.push(pushData);
      }
    }
  });

  var result = resultRecent.concat(resultAll);
  return result;
}

function click(item) {
  if (item.bundleID != 'at.obdev.LaunchBar') {
    LaunchBar.hide();
  }

  /// Remember Used Menu Item (per App)
  var recentItems = Action.preferences.recentItems;
  if (recentItems == undefined) {
    recentItems = [];
  }

  recentItems.forEach(function (item2, index) {
    if (item2.bundleID == item.bundleID) {
      recentItems.splice(index, 1);
    }
  });

  recentItems.push(item);
  Action.preferences.recentItems = recentItems;

  // Click menu item
  LaunchBar.execute(
    finbarCLI,
    'select',
    ...item.indices,
    `--title=${item.title}`
  );
}
