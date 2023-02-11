/* 
DuckDuckGo Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(
      'https://duckduckgo.com/?q=!ducky+' + encodeURIComponent(argument)
    );
  } else
    LaunchBar.openURL(
      'https://duckduckgo.com/?q=' + encodeURIComponent(argument)
    );
}
