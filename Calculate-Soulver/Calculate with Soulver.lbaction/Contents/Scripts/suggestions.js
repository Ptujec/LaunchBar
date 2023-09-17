// LaunchBar Action Script
include('default.js');

function runWithString(string) {
  if (string == '') return;

  const result = LaunchBar.execute(soulverCLI, string).trim();

  const dict = {
    title: result,
    label: '⌘↩ = Open Entry in Soulver',
    icon: 'equal',
  };

  if (result.startsWith('Error')) {
    dict.icon = 'error';
  }

  return [dict];
}
