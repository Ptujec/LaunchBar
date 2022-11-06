/* 
Set timer Action for LaunchBar
by Christian Bender (@ptujec)
2022-11-06

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  var list = LaunchBar.execute('/usr/bin/shortcuts', 'list').trim().split('\n');

  if (!list.includes('Set timer')) {
    var response = LaunchBar.alert(
      'Shortcut missing!',
      'The action needs the shortcut named "Set alarm" to run properly. Do you want to install it now?',
      'Yes',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          'https://www.icloud.com/shortcuts/6769921fa76d437faa22bec595020ede'
        );

      case 1:
        break;
    }
  } else {
    LaunchBar.hide();

    argument = argument.replace(/,/, '.');

    if (!isNaN(argument)) {
      // default to minutes
      argument = argument + 'm';
    }

    var m = argument.match(/((?:\d+)(?:\.\d+)?)([msh])?/i);

    var amount = m[1];
    var unit = m[2];

    if (unit == 'h') {
      var seconds = amount * 3600;
    } else if (unit == 'm') {
      var seconds = amount * 60;
    } else {
      var seconds = amount;
    }

    LaunchBar.executeAppleScript(
      'tell application "Shortcuts Events" to run shortcut "Set timer" with input "' +
        seconds +
        '"'
    );
  }
}
