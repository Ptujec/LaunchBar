/* 
Recent MindNode Next Documents Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-11

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: update readme (jetzt tatsächlich viewed nicht changed) … publish when out of beta
*/

const supportDir = `${LaunchBar.homeDirectory}/Library/Containers/com.ideasoncanvas.mindnode/Data/Library/Application Support/MindNode Next`;

function run() {
  const version = getLatestVersion();

  const cloudDocumentsDir = `${supportDir}/${version}/CloudDocuments`;

  const snapshotJson =
    File.readJSON(
      `${cloudDocumentsDir}/Caches/DocumentsMetadataSnapshot.json`
    ) || [];

  return snapshotJson
    .filter((obj) => !obj.isTrashed && obj.title)
    .sort((a, b) => b.lastViewedDate - a.lastViewedDate)
    .map((obj) => ({
      title: obj.title,
      icon: 'com.ideasoncanvas.mindnode',
      path: File.pathForFileURL(obj.previewImageFullsizeURL),
      action: 'open',
      actionArgument: `https://mindnode.com/document/${obj.id}#${encodeURI(
        obj.title
      )}`,
      actionRunsInBackground: true,
    }));
}

function open(url) {
  LaunchBar.hide();
  if (LaunchBar.options.shiftKey) return LaunchBar.paste(url);
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
