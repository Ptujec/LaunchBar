/* 
Menu Bar Items (powered by Finbar) Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const finbarCLI = '/Applications/Finbar.app/Contents/MacOS/finbar-cli';

function run() {
  const list = JSON.parse(LaunchBar.execute(finbarCLI, 'list', '--v2')).items;

  const recentItems = Action.preferences.recentItems;

  const recentUIDs = recentItems
    ? recentItems.map((item) => `${item.bundle_id}.${item.indices.join('.')}`)
    : [];

  const processedList = list
    .map((item) => {
      const uID = `${item.bundle_id}.${item.indices.join('.')}`;
      const subtitle = item.path.join(' > ');
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
          subtitle,
          icon: item.bundle_id,
          action: 'click',
          actionArgument: item,
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
  // Hide LaunchBar Interface (if your not using it for LaunchBar itself)
  if (item.bundle_id != 'at.obdev.LaunchBar') LaunchBar.hide();

  // Remember Used Menu Item (per App)
  const recentItems = (Action.preferences.recentItems || []).filter(
    (existingItem) => existingItem.bundle_id !== item.bundle_id
  );
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
