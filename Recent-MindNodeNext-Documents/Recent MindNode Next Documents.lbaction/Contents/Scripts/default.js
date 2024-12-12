/* 
Recent MindNode Next Documents Action for LaunchBar
by Christian Bender (@ptujec)
2024-11-26

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const supportDir = `${LaunchBar.homeDirectory}/Library/Containers/com.ideasoncanvas.mindnode/Data/Library/Application Support/MindNode Next`;

function run() {
  const version = getLatestVersion();

  const cloudDocumentsDir = `${supportDir}/${version}/CloudDocuments`;
  const dataBaseDir = `${cloudDocumentsDir}/Content.sqlite3`;
  const assetsDir = `${cloudDocumentsDir}/Assets/`;

  const output = LaunchBar.execute(
    '/bin/sh',
    './data.sh',
    dataBaseDir,
    assetsDir
  );

  if (!output) return { title: 'Nothing found', icon: 'alert' };

  const outputJson = JSON.parse(output);

  const assets = outputJson.assets ? outputJson.assets : [];

  return outputJson.documents.map((item) => {
    const previewImage = assets.find((asset) =>
      asset.startsWith(item.documentID)
    );

    return {
      title: item.title,
      icon: 'com.ideasoncanvas.mindnode',
      path: assetsDir + previewImage,
      action: 'open',
      actionArgument: `https://mindnode.com/document/${
        item.documentID
      }#${encodeURI(item.title)}`,
      actionRunsInBackground: true,
    };
  });
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
