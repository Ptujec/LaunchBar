/* 
Google Search Action for LaunchBar (with extended functionality)
by Christian Bender (@ptujec)
2025-06-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (LaunchBar.options.shiftKey) return LaunchBar.paste(argument);
  if (LaunchBar.options.commandKey) return argument;

  const baseURL = 'https://www.google.com';

  if (!argument) {
    LaunchBar.openURL(baseURL);
    return;
  }

  const url = LaunchBar.options.alternateKey
    ? 'https://duckduckgo.com/?q=!ducky+' + encodeURIComponent(argument)
    : baseURL + '/search?q=' + encodeURIComponent(argument);

  LaunchBar.openURL(url);
}
