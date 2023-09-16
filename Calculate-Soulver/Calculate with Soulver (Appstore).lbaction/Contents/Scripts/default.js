/* 
Soulver CL Action for LaunchBar
by Christian Bender (@ptujec)
2022-06-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://documentation.soulver.app/documentation/command-line-tool-automator-and-services
*/

const soulverCLI = '/Applications/Soulver 3.app/Contents/MacOS/CLI/soulver';
const prefs = Action.preferences;

function run(argument) {
  if (LaunchBar.options.shiftKey) {
    return showOptions();
  }

  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(
      'x-soulver://x-callback-url/create?&expression=' + encodeURI(argument)
    );
    return;
  }

  if (!File.exists(soulverCLI)) {
    const response = LaunchBar.alert(
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

  let result = LaunchBar.execute(soulverCLI, argument).trim();

  if (prefs.copy != false) {
    LaunchBar.setClipboardString(result);
  }

  if (!result.startsWith('Error')) {
    return [
      {
        title: result,
        subtitle: argument,
        alwaysShowsSubtitle: true,
        icon: 'app.soulver.appstore.mac',
      },
    ];
  }
}

function showOptions() {
  const copy = {
    title: 'Copy result to Clipboard',
    icon: 'circleTemplate',
    action: 'toggleCopy',
  };

  if (prefs.copy != false) {
    copy.icon = 'checkedTemplate';
  }

  return [copy];
}

function toggleCopy() {
  if (prefs.copy != false) {
    prefs.copy = false;
  } else {
    prefs.copy = true;
  }
  return showOptions();
}
