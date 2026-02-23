/* 
Gigafide Action for LaunchBar
by Christian Bender (@ptujec)
2026-02-23

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  LaunchBar.hide();

  if (!argument) {
    LaunchBar.openURL('https://viri.cjvt.si/gigafida/');
    return;
  }

  argument = argument.trim().replace(/\s+/g, '+');
  const encodedArgument = encodeURI(argument);

  const url = `https://viri.cjvt.si/gigafida/Concordance/Search?Query=${encodedArgument}`;

  LaunchBar.openURL(url);
}
