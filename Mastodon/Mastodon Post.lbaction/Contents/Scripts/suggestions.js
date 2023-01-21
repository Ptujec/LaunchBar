// LaunchBar Action Script

function runWithString(string) {
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
