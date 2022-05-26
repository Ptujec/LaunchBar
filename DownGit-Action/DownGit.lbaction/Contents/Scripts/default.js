// LaunchBar Action Script

function run(argument) {
  if (argument == undefined) {
    argument = LaunchBar.executeAppleScript(
      'tell application "Safari" to set _URL to URL of front document',
      'return _URL'
    ).trim();
    if (argument.startsWith('https://github.com/')) {
      LaunchBar.openURL(
        'https://minhaskamal.github.io/DownGit/#/home?url=' +
          encodeURIComponent(argument)
      );
    } else {
      LaunchBar.alert('Unsupported URL');
    }
  } else {
    LaunchBar.hide();
    LaunchBar.openURL(
      'https://minhaskamal.github.io/DownGit/#/home?url=' +
        encodeURIComponent(argument)
    );
  }
}
