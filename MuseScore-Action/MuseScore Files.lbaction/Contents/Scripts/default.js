// LaunchBar Action Script
var folderPath = Action.preferences.folderPath;

function run() {
  if (LaunchBar.options.shiftKey) {
    var output = settings();
    return output;
  } else {
    try {
      var plist = File.readPlist(
        '~/Library/Preferences/org.musescore.MuseScore3.plist'
      );
    } catch (exception) {
      LaunchBar.alert('Error while reading plist: ' + exception);
    }
    if (Action.preferences.mode == 'folder') {
      if (folderPath == undefined || folderPath == '') {
        var folderPath = plist['application.paths.myScores'];

        Action.preferences.folderPath = folderPath;
      }

      // var contents = File.getDirectoryContents(folderPath);
      var contents = LaunchBar.execute('/bin/ls', '-tA', folderPath)
        .trim()
        .split('\n');

      var results = [];
      contents.forEach(function (item) {
        var path = folderPath + '/' + item;

        if (!item.startsWith('.') && !item.endsWith('autosave')) {
          results.push({
            title: item,
            // subtitle: '',
            path: path,
          });
        }
      });

      return results;
    } else {
      var results = [];

      for (var i = 0; i < 19; i++) {
        var recentPath = plist['recent-' + i];
        if (!recentPath.startsWith(':')) {
          results.push({
            path: recentPath,
          });
        }
      }
      return results;
    }
  }
}

function settings() {
  if (Action.preferences.mode == 'folder') {
    var folderIcon = 'folderSelectedTemplate';
    var recentIcon = 'recentTemplate';
  } else {
    var folderIcon = 'folderTemplate';
    var recentIcon = 'recentSelectedTemplate';
  }

  return [
    {
      title: 'Scores Folder',
      icon: folderIcon,
      action: 'setMode',
      actionArgument: 'folder',
    },
    {
      title: 'Recent Files',
      icon: recentIcon,
      action: 'setMode',
      actionArgument: 'recent',
    },
  ];
}

function setMode(mode) {
  Action.preferences.mode = mode;

  var output = settings();
  return output;
}
