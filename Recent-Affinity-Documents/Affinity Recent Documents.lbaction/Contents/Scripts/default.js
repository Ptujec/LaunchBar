/* 
Affinity Recent Documents Action for LaunchBar
by Christian Bender (@ptujec)
2025-11-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  const plist = File.readPlist(
    '~/Library/Application Support/Affinity/mru3.dat'
  );
  const plistString = JSON.stringify(plist);
  const fileURLs = plistString.match(/file.*?\.(afdesign|afphoto|afpub|af)/g);

  return fileURLs.map((fileURL) => {
    const path = File.pathForFileURL(fileURL);

    if (File.exists(path)) {
      return {
        title: File.displayName(path),
        path,
        action: 'open',
        actionArgument: fileURL,
        actionRunsInBackground: true,
        // alwaysShowsSubtitle: true,
      };
    }
  });
}

function open(fileURL) {
  LaunchBar.hide();
  LaunchBar.openURL(fileURL, 'com.canva.affinity');
}
