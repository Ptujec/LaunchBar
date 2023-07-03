/* 
Menu Bar Items (powered by Finbar) Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const finbarCLI = '/Applications/Finbar.app/Contents/MacOS/finbar-cli';

function run() {
  const list = JSON.parse(LaunchBar.execute(finbarCLI, 'list'));

  const recentItems = Action.preferences.recentItems;

  const recentUIDs = recentItems
    ? recentItems.map((item) => item.bundleID + '.' + item.indices.join('.'))
    : [];

  const processedList = list
    .map((item) => {
      const uID = item.bundleID + '.' + item.indices.join('.');
      const sub = item.path.join(' > ');
      const title = item.mark ? `${item.title} ${item.mark}` : item.title;

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
          uID,
          title,
          subtitle: sub,
          icon: item.bundleID,
          action: 'click',
          actionArgument: {
            bundleID: item.bundleID,
            indices: item.indices,
            title: item.title,
          },
          actionRunsInBackground: true,
          alwaysShowsSubtitle: true,
        };

        if (item.shortcut) {
          pushData.badge = item.shortcut.replace(/([⌘⇧⌃⌥])/g, '$1 ');
        }

        return pushData;
      }
    })
    .filter((item) => item);

  const resultRecent = processedList.filter((item) =>
    recentUIDs.includes(item.uID)
  );
  const resultAll = processedList.filter(
    (item) => !recentUIDs.includes(item.uID)
  );

  return [...resultRecent, ...resultAll];
}

function click(item) {
  if (item.bundleID != 'at.obdev.LaunchBar') LaunchBar.hide();

  /// Remember Used Menu Item (per App)
  let recentItems = Action.preferences.recentItems || [];

  recentItems = recentItems.filter((item2) => item2.bundleID !== item.bundleID);

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
