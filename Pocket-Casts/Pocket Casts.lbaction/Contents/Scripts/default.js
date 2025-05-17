/* 
Pocket Casts Action for LaunchBar
by Christian Bender (@ptujec)
2025-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Links:
- https://blog.pocketcasts.com/2024/05/14/introducing-the-pocket-casts-browser-extension/
- https://github.com/Automattic/pocket-casts-ai-scripts


TODO: 
- check if already open in browser
- suggestions directly from pocketcasts API?
- return results in interface?
*/

function run(argument) {
  if (argument) {
    LaunchBar.hide();
    LaunchBar.openURL(
      `https://play.pocketcasts.com/search?q=${encodeURI(argument)}`
    );
    return;
  }

  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL('https://play.pocketcasts.com/in-progress');
    return;
  }

  return [
    {
      title: 'New Releases',
      icon: 'newTemplate',
      url: 'https://play.pocketcasts.com/new-releases',
    },
    {
      title: 'In Progress',
      icon: 'progressTemplate',
      url: 'https://play.pocketcasts.com/in-progress',
    },
    {
      title: 'Starred',
      icon: 'starTemplate',
      url: 'https://play.pocketcasts.com/starred',
    },
    {
      title: 'History',
      icon: 'historyTemplate',
      url: 'https://play.pocketcasts.com/history',
    },
  ];
}
