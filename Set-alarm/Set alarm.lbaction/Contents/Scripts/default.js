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
      'The action needs the shortcut named "Set alarm" to run properly. Do you want to install it now?',
      'Yes',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          'https://www.icloud.com/shortcuts/fdb0869ec1f04bab9390ba988d6e2eab'
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
        var title = argument
          .replace(/(^\d+:?(?:\d+)?)(?:(?:\s)(.*))?/gi, '$2')
          .trim();

        // Capitalize title
        title = title.charAt(0).toUpperCase() + title.slice(1);

        var time = argument
          .replace(/(^\d+:?(?:\d+)?)(?:(?:\s)(.*))?/gi, '$1')
          .trim();

        if (!time.includes(':')) {
          if (time.length < 3) {
            time = time + ':00';
          } else if (time.length == 3) {
            time = time.replace(/^(\d\d)/, '$1:') + '0';
          } else if (time.length == 4) {
            time = time.replace(/^(\d\d)/, '$1:');
          }

          return [
            {
              title: time + ' ' + title,
              icon: 'com.apple.clock',
              action: 'setTime',
              actionArgument: time + ' ' + title,
              actionRunsInBackground: true,
            },
          ];
        } else {
          if (time.length == 3) {
            time = time + '0';
          }
          if (time.length == 2) {
            time = time + '00';
          }

          return [
            {
              title: time + ' ' + title,
              icon: 'com.apple.clock',
              action: 'setTime',
              actionArgument: time + ' ' + title,
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
      '"\n' +
      'tell application "Clock" to activate'
  );
}
