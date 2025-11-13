/* 
Recent MindNode Next Documents Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-11

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

const supportDir = `${LaunchBar.homeDirectory}/Library/Containers/com.ideasoncanvas.mindnode/Data/Library/Application Support/MindNode Next`;

function run() {
  const version = getLatestVersion();

  const darkMode =
    File.readPlist('~/Library/Preferences/.GlobalPreferences.plist')
      .AppleInterfaceStyle === 'Dark'; // takes a few seconds to update after changing

  const preview = darkMode ? 'darkPreview' : 'lightPreview';

  const cloudDocumentsDir = `${supportDir}/${version}/CloudDocuments`;

  const snapshotData = File.readJSON(
    `${cloudDocumentsDir}/Caches/DocumentsMetadataSnapshot.json`
  ) || { documents: {} };

  return Object.values(snapshotData.documents)
    .filter((obj) => !obj.isTrashed && obj.title)
    .sort(
      (a, b) =>
        (b.lastViewedDate ?? -Infinity) - (a.lastViewedDate ?? -Infinity)
    )
    .map((obj) => {
      let previewPath = File.pathForFileURL(obj[preview].fullSizeURL);

      if (!File.exists(previewPath)) {
        const altPreview = darkMode ? 'lightPreview' : 'darkPreview';
        previewPath = File.pathForFileURL(obj[altPreview].fullSizeURL);
        if (!File.exists(previewPath)) previewPath = undefined;
      }

      const lastModifiedDate = LaunchBar.formatDate(
        new Date((obj.lastModifiedDate + 978307200) * 1000),
        {
          relativeDateFormatting: true,
          timeStyle: 'short',
          dateStyle: 'short',
        }
      );

      return {
        title: obj.title,
        subtitle: lastModifiedDate,
        // alwaysShowsSubtitle: true,
        icon: 'com.ideasoncanvas.mindnode',
        path: previewPath,
        action: 'open',
        actionArgument: {
          url: `https://mindnode.com/document/${obj.id}#${encodeURI(
            obj.title
          )}`,
          title: obj.title,
        },
        actionRunsInBackground: true,
      };
    });
}

function open({ url, title }) {
  LaunchBar.hide();
  if (LaunchBar.options.alternateKey) {
    return LaunchBar.paste(`[${title}](${url})`);
  }
  if (LaunchBar.options.shiftKey) return LaunchBar.paste(url);
  if (LaunchBar.options.commandKey) {
    LaunchBar.executeAppleScript(`
        tell application "MindNode Next" to activate
        delay 0.6
        tell application "System Events" 
          keystroke "o" using {command down}
          delay 0.4
          keystroke "f" using {command down}
          delay 0.2
          keystroke "a" using {command down}
        end tell

	      delay 0.2
        tell application "LaunchBar" to perform action "Copy and Paste" with string "${title}"
      `);

    return;
  }
  LaunchBar.openURL(url);
}

// FUNCTIONS TO DETECT THE LATEST PRODUCTION VERSION

function getLatestVersion() {
  const directories = File.getDirectoryContents(supportDir).filter((dir) =>
    dir.startsWith('production-v')
  );

  const prodcutionDirsArray = directories.map((directory) => {
    const versionNumber = directory.match(/\d+/g).join('.');
    return { directory, versionNumber };
  });

  return prodcutionDirsArray.reduce(
    (latest, current) =>
      isNewerVersion(current.versionNumber, latest ? latest.versionNumber : '')
        ? current
        : latest,
    null
  )?.directory;
}

function isNewerVersion(currentVersion, latestVersion) {
  const tParts = currentVersion.split('.').map(Number);
  const iParts = latestVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(tParts.length, iParts.length); i++) {
    const a = tParts[i] || 0;
    const b = iParts[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}
