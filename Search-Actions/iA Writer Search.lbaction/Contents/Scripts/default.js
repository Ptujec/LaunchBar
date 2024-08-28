/* 
iA Writer Search Action for LaunchBar
by Christian Bender (@ptujec)
2022-03-27

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (argument == '') {
    return;
  }

  let folderPath, plist;

  if (LaunchBar.options.shiftKey) {
    folderPath = LaunchBar.executeAppleScript(
      'set _home to path to home folder as string',
      'set _default to _home & "Library:Mobile Documents:" as alias',
      'set _folder to choose folder with prompt "Select a folder for this action:" default location _default',
      'set _folder to POSIX path of _folder'
    ).trim();

    if (!folderPath) return;
    Action.preferences.folderLocation = folderPath;
  }

  folderPath = Action.preferences.folderLocation;

  if (!folderPath) {
    try {
      plist = File.readPlist(
        '~/Library/Containers/pro.writer.mac/Data/Library/Preferences/pro.writer.mac.plist'
      );
    } catch (exception) {
      LaunchBar.alert('Error while reading plist: ' + exception);
      return;
    }

    if (plist.NSNavLastRootDirectory) {
      folderPath = File.pathForFileURL(
        File.fileURLForPath(plist.NSNavLastRootDirectory)
      );
    }

    if (!folderPath) {
      folderPath = LaunchBar.executeAppleScript(
        'set _home to path to home folder as string',
        'set _default to _home & "Library:Mobile Documents:" as alias',
        'set _folder to choose folder with prompt "Select a folder for this action:" default location _default',
        'set _folder to POSIX path of _folder'
      ).trim();
      if (!folderPath) {
        LaunchBar.alert('Could not set folder path!');
        return;
      }
      Action.preferences.folderLocation = folderPath;
    } else {
      Action.preferences.folderLocation = folderPath;
    }
  }

  if (argument == undefined) {
    var contents = LaunchBar.execute('/bin/ls', '-tA', folderPath)
      .trim()
      .split('\n');

    var result = [];
    for (var i = 0; i < contents.length; i++) {
      var path = folderPath + '/' + contents[i];
      if (contents[i].includes('.txt') || contents[i].includes('.md')) {
        result.push({
          title: contents[i],
          path: path,
        });
      }
    }
    return result;
  } else {
    argument = argument.toLowerCase().trim();

    if (LaunchBar.options.commandKey) {
      // Dateiname
      var output = LaunchBar.execute(
        '/usr/bin/mdfind',
        '-onlyin',
        folderPath,
        '-name',
        argument
      ).split('\n');
    } else {
      var output = LaunchBar.execute(
        '/usr/bin/mdfind',
        '-onlyin',
        folderPath,
        argument
      ).split('\n');
    }

    if (output == '') {
      return [
        {
          title: 'Keine Treffer',
          icon: 'pro.writer.mac',
        },
      ];
    } else {
      let results = [];
      let subtitle;
      for (var i = 0; i < output.length; i++) {
        var result = output[i];
        if (result != '' && !File.isDirectory(result)) {
          var path = result;
          var title = File.displayName(path);

          if (LaunchBar.options.commandKey) {
            results.push({
              title: title,
              path: path,
            });
          } else {
            var regex = new RegExp('.*' + argument + '.*', 'gi');
            try {
              subtitle = File.readText(path).match(regex);
            } catch (error) {}

            if (subtitle != null) {
              subtitle = subtitle.toString().replace(/\n/g, ' ').trim();

              results.push({
                title,
                subtitle,
                path,
                alwaysShowsSubtitle: true,
              });
            } else {
              results.push({ title, path });
            }
          }
        }
      }
      // results.sort(function (a, b) {
      //   return a.title > b.title;
      // });

      results.sort((a, b) => {
        // Check if either titles start with argument
        const aStartsWithArg = a.title
          .toLowerCase()
          .startsWith(argument.toLowerCase());
        const bStartsWithArg = b.title
          .toLowerCase()
          .startsWith(argument.toLowerCase());

        // If both do, sort by full title alphabetically
        if (aStartsWithArg && bStartsWithArg) {
          return a.title.localeCompare(b.title);
        }
        // If only a does, put it first
        else if (aStartsWithArg) {
          return -1;
        }
        // If only b does, put it first
        else if (bStartsWithArg) {
          return 1;
        }
        // If neither does, sort by full title alphabetically
        else {
          return a.title.localeCompare(b.title);
        }
      });

      return results;
    }
  }
}
