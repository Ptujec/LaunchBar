/* 
Set alarm Action for LaunchBar
by Christian Bender (@ptujec)
2022-11-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  var list = LaunchBar.execute('/usr/bin/shortcuts', 'list').trim().split('\n');

  if (!list.includes('Set alarm')) {
    var response = LaunchBar.alert(
      'Shortcut missing!',
      'The action needs the shortcut named "Sett alarm" to run properly. Do you want to install it now?',
      'Yes',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          'https://www.icloud.com/shortcuts/fd2253e5855646f98dbf663cf6931097'
        );

      case 1:
        break;
    }
  } else {
    if (argument != '') {
      //
      let pattern = /^\d+/;

      let result = pattern.test(argument);

      if (result == true) {
        if (!argument.includes(':')) {
          if (argument.length < 3) {
            argument = argument + ':00';
          } else if (argument.length == 3) {
            argument = argument.replace(/^(\d\d)/, '$1:') + '0';
          } else if (argument.length == 4) {
            argument = argument.replace(/^(\d\d)/, '$1:');
          }

          return [
            {
              title: argument,
              icon: 'com.apple.clock',
              action: 'setTime',
              actionArgument: argument,
              actionRunsInBackground: true,
            },
          ];
        } else {
          if (argument.length == 3) {
            argument = argument + '0';
          }
          return [
            {
              title: argument,
              icon: 'com.apple.clock',
              action: 'setTime',
              actionArgument: argument,
              actionRunsInBackground: true,
            },
          ];
        }
      } else {
        return [
          {
            title: argument,
            icon: 'com.apple.clock',
            action: 'setTime',
            actionArgument: argument,
            actionRunsInBackground: true,
          },
        ];
      }
    }
  }
}

function setTime(time) {
  LaunchBar.hide();
  LaunchBar.executeAppleScript(
    'tell application "Shortcuts Events" to run shortcut "Set alarm" with input "' +
      time +
      '"',
    'tell application "Clock" to activate'
  );
}
