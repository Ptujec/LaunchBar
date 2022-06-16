// LaunchBar Action Script
const soulverClt = '/usr/local/bin/soulver';

function runWithString(string) {
  if (string == '') {
    return;
  }

  var result = LaunchBar.execute(soulverClt, string).trim();
  return [
    {
      title: result,
      icon: 'equal',
    },
  ];
}
