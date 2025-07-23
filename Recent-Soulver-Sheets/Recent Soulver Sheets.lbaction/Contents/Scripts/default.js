/* 
Recent Soulver Sheets Action for LaunchBar
by Christian Bender (@ptujec)
2025-06-11

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

const groupContainerDir = `${LaunchBar.homeDirectory}/Library/Group Containers/`;

const icloudSheetbookPath = `${LaunchBar.homeDirectory}/Library/Mobile Documents/iCloud~app~soulver/Documents/Default.sheetbook`;

const localSheetbookPath = `${LaunchBar.homeDirectory}/Library/Application Support/app.soulver.mac/Default.sheetbook`;

function run() {
  let defaultSheetbookPath = File.exists(localSheetbookPath)
    ? localSheetbookPath
    : File.exists(icloudSheetbookPath)
    ? icloudSheetbookPath
    : getDefaultSheetbookPath();

  LaunchBar.log(`\nUsing Sheetbook Path: ${defaultSheetbookPath}`);

  const groupContainers = File.getDirectoryContents(groupContainerDir);

  const soulverGroupContainer = groupContainers.find((item) =>
    item.endsWith('group.app.soulver')
  );

  if (!soulverGroupContainer) {
    LaunchBar.log('Soulver Group Container Not Found');
  }

  const previews = `${groupContainerDir}${soulverGroupContainer}/Previews`;

  if (!File.exists(previews)) {
    LaunchBar.log('Soulver Previews Directory Not Found');
  }

  const defaultSheetbookData = File.readJSON(defaultSheetbookPath);

  return (sheets = defaultSheetbookData.store.folders
    .filter((folder) => folder.name !== 'SV_TRASH')
    .flatMap((folder) =>
      folder.sheets.map((sheet) => {
        const previewHTML = `${previews}/${sheet.uniqueIdentifier}/preview.html`;
        const hasPreview = File.exists(previewHTML);

        const date = new Date((sheet.modificationDate + 978307200) * 1000);
        const formattedDate = LaunchBar.formatDate(date, {
          relativeDateFormatting: true,
          timeStyle: 'short',
          dateStyle: 'short',
        });

        const title =
          sheet.preview?.shortPreview
            .split('\n')[0]
            .replace(/^#\s*/, '')
            .replace(/:$/, '') || 'Empty'.localize();

        badge =
          defaultSheetbookData.store.folders.length > 2
            ? folder.name === 'SV_GENERAL'
              ? 'General'.localize()
              : folder.name
            : undefined;

        return {
          title,
          path: hasPreview ? previewHTML : undefined,
          subtitle: formattedDate,
          badge,
          alwaysShowsSubtitle: true,
          icon: 'sheetIcon',
          action: 'open',
          actionArgument: sheet.uniqueIdentifier,
          actionRunsInBackground: true,
          date: sheet.modificationDate,
        };
      })
    )
    .sort((a, b) => b.date - a.date));
}

function open(id) {
  LaunchBar.hide();
  LaunchBar.openURL(`x-soulver://x-callback-url/open?&id=${id}`);
}

function getDefaultSheetbookPath() {
  if (File.exists(Action.preferences.defaultSheetbookPath)) {
    return Action.preferences.defaultSheetbookPath;
  }
  const root = File.exists('./getRoot')
    ? LaunchBar.execute('/bin/bash', './getRoot')?.trim()
    : LaunchBar.execute('/usr/bin/swift', './getRoot.swift').trim();

  Action.preferences.defaultSheetbookPath = `${root}/Default.sheetbook`;
  return `${root}/Default.sheetbook`;
}
