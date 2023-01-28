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
  var count = [
    {
      title: string.length + '/500',
      icon: 'postTemplate',
    },
  ];

  if (string.length > 400) {
    return count;
  }
}
