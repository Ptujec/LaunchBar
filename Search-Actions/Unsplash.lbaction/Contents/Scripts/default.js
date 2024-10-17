/* 
Unsplash Search Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  LaunchBar.openURL('https://unsplash.com/s/photos/' + encodeURI(argument));
}
