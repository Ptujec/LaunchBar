/* 
Soulver CL Action for LaunchBar
by Christian Bender (@ptujec)
2022-06-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://documentation.soulver.app/documentation/command-line-tool-automator-and-services
*/

const soulverCLI = '/Applications/Soulver 3.app/Contents/MacOS/CLI/soulver';

function run(argument) {
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

  const result = LaunchBar.execute(soulverCLI, argument).trim();

  if (LaunchBar.options.shiftKey) return LaunchBar.paste(result);

  if (!result.startsWith('Error')) {
    return [
      {
        title: result,
        subtitle: argument,
        alwaysShowsSubtitle: true,
        icon: 'app.soulver.mac',
      },
    ];
  }
}
