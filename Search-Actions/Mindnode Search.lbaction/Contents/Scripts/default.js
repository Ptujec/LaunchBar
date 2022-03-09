/* 
Mindnode Search 
by Ptujec 
2021-07-12
*/
var folderPath = Action.preferences.folderLocation;

function run(argument) {
  if (folderPath == undefined || folderPath == '') {
    try {
      var plist = File.readPlist(
        '~/Library/Containers/com.ideasoncanvas.mindnode.macos/Data/Library/Preferences/com.ideasoncanvas.mindnode.macos.plist'
      );
    } catch (exception) {
      LaunchBar.alert('Error while reading plist: ' + exception);
    }

    var folderPath = File.pathForFileURL(
      File.fileURLForPath(plist.NSNavLastRootDirectory)
    );

    if (folderPath == undefined) {
      var folderPath = LaunchBar.executeAppleScript(
        'set _home to path to home folder as string',
        'set _default to _home & "Library:Mobile Documents:" as alias',
        'set _folder to choose folder with prompt "Select a folder for this action:" default location _default',
        'set _folder to POSIX path of _folder'
      ).trim();
      Action.preferences.folderLocation = folderPath;
    } else {
      Action.preferences.folderLocation = folderPath;
    }
  } else if (LaunchBar.options.shiftKey) {
    var folderPath = LaunchBar.executeAppleScript(
      'set _home to path to home folder as string',
      'set _default to _home & "Library:Mobile Documents:" as alias',
      'set _folder to choose folder with prompt "Select a folder for this action:" default location _default',
      'set _folder to POSIX path of _folder'
    ).trim();
    Action.preferences.folderLocation = folderPath;
    return;
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

              var sub = content
                .match(regex)
                .toString()
                .replace(/</g, '')
                .trim();
            } catch (error) {}

            if (sub != null) {
              results.push({
                subtitle: sub,
                path: path,
              });
            } else {
              results.push({
                path: path,
              });
            }
          }
        }
      }
      results.sort(function (a, b) {
        return a.path > b.path;
      });
      return results;
    }
  }
}
