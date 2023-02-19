// LaunchBar Action Script

function runWithString(string) {
  if (string.includes('..')) {
    // Get Markdown Links from Mail and Safari
    var output = LaunchBar.executeAppleScript(
      'tell application "Safari" to set _URL to URL of front document'
    ).trim();

    var newString =
      string.trim().replace('..', ' ').replace(/\s\s+/g, '') + ' ' + output;

    return [
      {
        title: newString,
        icon: 'link2Template',
      },
    ];
  }

  if (Action.preferences.count != 'always') {
    if (string.length < 400) {
      return;
    }
  }

  if (string.length > 500) {
    var icon = 'countRed';
  } else {
    var icon = 'postTemplate';
  }

  var count = [
    {
      title: string.length + '/500',
      icon: icon,
    },
  ];

  return count;
}
