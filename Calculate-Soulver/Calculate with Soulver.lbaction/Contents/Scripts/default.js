/* 
Soulver CL Action for LaunchBar
by Christian Bender (@ptujec)
2022-06-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://documentation.soulver.app/documentation/command-line-tool-automator-and-services
*/

const soulverClt = '/Applications/Soulver 3.app/Contents/MacOS/CLI/soulver';
const prefs = Action.preferences;

function run(argument) {
  if (LaunchBar.options.shiftKey) {
    var output = showOptions();
    return output;
  }

  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(
      'x-soulver://x-callback-url/create?&expression=' + encodeURI(argument)
    );
    return;
  }

  if (!File.exists(soulverClt)) {
    var response = LaunchBar.alert(
      'Missing Soulver Command Line Interface',
      'The Soulver Command Line Interface was not found in the expected location. Press "Help" and read what is written about the Alfred Workflow. This applies for the LaunchBar Action aswell.',
      'Help',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          'https://documentation.soulver.app/documentation/command-line-tool-automator-and-services'
        );
      case 1:
        break;
    }
    return;
  }

  let result = LaunchBar.execute(soulverClt, argument);

  if (prefs.copy != false) {
    LaunchBar.setClipboardString(result);
  }

  if (!result.startsWith('Error')) {
    return [
      {
        title: result,
        subtitle: argument,
        icon: 'app.soulver.mac',
      },
    ];
  }
}

function showOptions() {
  var copy = {
    title: 'Copy result to Clipboard',
    icon: 'circleTemplate',
    action: 'toggleCopy',
  };

  if (prefs.copy != false) {
    copy.icon = 'checkedTemplate';
  }

  var options = [copy];
  return options;
}

function toggleCopy() {
  if (prefs.copy != false) {
    prefs.copy = false;
  } else {
    prefs.copy = true;
  }
  var output = showOptions();
  return output;
}
