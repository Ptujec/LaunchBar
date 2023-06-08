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

  const processedList = list
    .map((item) => {
      const uID = item.bundleID + '.' + item.indices.join('.');
      const sub = item.path.join(' > ');
      let title = item.title;

      if (item.mark != undefined) {
        title = title + ' ' + item.mark;
      }

      if (
        item.indices[1] != 0 &&
        !item.path.includes('Open Recent') &&
        !item.path.includes('Benutzte Dokumente') &&
        !item.path.includes('Verlauf') &&
        !item.path.includes('History') &&
        !item.path.includes('Services') &&
        !item.path.includes('Dienste')
      ) {
        const pushData = {
          uID: uID,
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
          pushData.badge = item.shortcut.replace(/([⌘⇧⌃⌥])/g, '$1 ');
        }

        return pushData;
      }
    })
    .filter((item) => item !== undefined);

  const resultRecent = processedList.filter((item) =>
    recentUIDs.includes(item.uID)
  );
  const resultAll = processedList.filter(
    (item) => !recentUIDs.includes(item.uID)
  );

  const result = resultRecent.concat(resultAll);
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
