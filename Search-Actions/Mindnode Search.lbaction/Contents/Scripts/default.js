/*
MindNode Search Action for LaunchBar
by Christian Bender (@ptujec)
2026-06-21

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

function run(argument) {
  if (argument === '') return;

  if (LaunchBar.options.shiftKey) return chooseFolder();
  const folderPath = Action.preferences.folderLocation || getDefaultFolder();

  // const test = LaunchBar.execute('/bin/ls', '-tA', folderPath);

  if (!argument) {
    return LaunchBar.execute('/bin/ls', '-t', folderPath)
      .trim()
      .split('\n')
      .filter((item) => item.includes('.mindnode'))
      .map((item) => ({ title: item, path: `${folderPath}/${item}` }));
  }

  argument = argument.toLowerCase().trim();

  const pathsString = LaunchBar.execute(
    '/usr/bin/mdfind',
    '-onlyin',
    folderPath,
    argument,
  );

  if (pathsString == '') {
    return { title: 'No matches'.localize(), icon: 'alert' };
  }

  const paths = pathsString.split('\n').filter((p) => p.trim());
  return handleMatches(paths, argument);
}

function handleMatches(paths, argument) {
  const results = paths
    .map((path) => {
      const title = File.displayName(path);

      let subtitle;
      try {
        const contents = JSON.stringify(File.readPlist(path + '/contents.xml'));
        const regex = new RegExp(
          '([a-zčšžäüöß]* )*?' + argument + '.*?<',
          'gi',
        );
        subtitle = contents.match(regex)?.join(', ').replace(/</g, '').trim();
      } catch (error) {
        subtitle = '  ';
      }

      return subtitle
        ? { title, subtitle, path, alwaysShowsSubtitle: true }
        : { title, path };
    })
    .sort((a, b) => {
      const aStartsWithArg = a.title
        .toLowerCase()
        .startsWith(argument.toLowerCase());
      const bStartsWithArg = b.title
        .toLowerCase()
        .startsWith(argument.toLowerCase());

      // Prioritize items that start with argument, then sort alphabetically
      return aStartsWithArg === bStartsWithArg
        ? a.title.localeCompare(b.title)
        : aStartsWithArg
          ? -1
          : 1;
    });

  return results;
}

function chooseFolder() {
  LaunchBar.hide();
  const newLocation = LaunchBar.executeAppleScript(
    `
    set _home to path to home folder as string
    set _default to _home & "Library:Mobile Documents:" as alias
    set _folder to choose folder with prompt "Select a folder for this action:" default location _default
    set _folder to POSIX path of _folder
    `,
  ).trim();

  if (!newLocation) return;
  Action.preferences.folderLocation = newLocation;
  return;
}

function getDefaultFolder() {
  let plist, folderPath;

  try {
    plist = File.readPlist(
      '~/Library/Containers/com.ideasoncanvas.mindnode.macos/Data/Library/Preferences/com.ideasoncanvas.mindnode.macos.plist',
    );
  } catch (exception) {
    LaunchBar.alert(`Error while reading plist: ${exception}`);
    return;
  }

  if (plist.NSOSPLastRootDirectory) {
    const bookmarkData = plist.NSOSPLastRootDirectory;
    try {
      folderPath = File.pathFromBookmarkData(bookmarkData, {
        withoutUI: true,
      });
    } catch (error) {
      LaunchBar.log(`Bookmark decode error: ${error}`);
      folderPath = undefined;
    }
  }

  if (folderPath) Action.preferences.folderLocation = folderPath;
  if (!folderPath) folderPath = chooseFolder();

  return folderPath;
}
