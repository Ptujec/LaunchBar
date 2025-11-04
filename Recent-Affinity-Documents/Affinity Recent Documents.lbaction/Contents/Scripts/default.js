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
        subtitle: path,
        action: 'open',
        actionArgument: {
          fileURL,
          path,
        },
        actionRunsInBackground: true,
      };
    }
  });
}

function open({ fileURL, path }) {
  LaunchBar.hide();

  if (LaunchBar.options.commandKey) {
    LaunchBar.executeAppleScript(
      `tell application "Finder" 
        reveal POSIX file "${path}"
        activate
      end tell`
    );
  } else {
    LaunchBar.openURL(fileURL, 'com.canva.affinity');
  }
}
