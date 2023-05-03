/* 
Neeva Search Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  LaunchBar.hide();
  LaunchBar.openURL(
    'https://neeva.com/search?q=' + encodeURI(argument) + '&src=mkthome'
  );
}
