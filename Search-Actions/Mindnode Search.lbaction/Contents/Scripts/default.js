/* 
MindNode Search Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-31

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
        '~/Library/Containers/com.ideasoncanvas.mindnode.macos/Data/Library/Preferences/com.ideasoncanvas.mindnode.macos.plist'
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
      if (contents[i].includes('.mindnode')) {
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
          title: 'No result',
          icon: 'com.ideasoncanvas.mindnode.macos',
        },
      ];
    } else {
      var results = [];
      for (var i = 0; i < output.length; i++) {
        var result = output[i];
        if (result != '') {
          var path = result;
          var title = File.displayName(path);

          if (LaunchBar.options.commandKey) {
            results.push({
              title: title,
              path: path,
            });
          } else {
            try {
              var content = File.readPlist(path + '/contents.xml');
              content = JSON.stringify(content);

              var regex = new RegExp(
                '([a-zčšžäüöß]* )*?' + argument + '.*?<',
                'gi'
              );

              var subtitle = content
                .match(regex)
                .join(', ')
                .replace(/</g, '')
                .trim();
            } catch (error) {}

            if (subtitle != null) {
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
