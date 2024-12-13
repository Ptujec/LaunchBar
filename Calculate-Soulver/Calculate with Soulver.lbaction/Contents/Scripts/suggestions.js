/* 
Soulver CL Action for LaunchBar
by Christian Bender (@ptujec)
2022-06-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://documentation.soulver.app/documentation/command-line-tool-automator-and-services
*/

include('default.js');

function runWithString(string) {
  if (string == '') return;

  const result = LaunchBar.execute(soulverCLI, string).trim();

  const dict = {
    title: result,
    label: '⌘↩ = Open Entry in Soulver',
    icon: 'equal',
  };

  // LaunchBar.log(result);

  if (result == '') return;

  if (result.startsWith('Error')) {
    dict.icon = 'error';
  }

  return dict;
}
