// LaunchBar Action Script
const soulverClt = '/Applications/Soulver 3.app/Contents/MacOS/CLI/soulver';

function runWithString(string) {
  if (string == '') {
    return;
  }

  var result = LaunchBar.execute(soulverClt, string).trim();

  var dict = {
    title: result,
    label: '⌘↩ = Open Entry in Soulver',
    icon: 'equal',
  };

  if (result.startsWith('Error')) {
    dict.icon = 'error';
  }

  return [dict];
}
