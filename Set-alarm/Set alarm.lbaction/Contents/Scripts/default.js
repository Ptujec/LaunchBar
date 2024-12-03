/* 
Set alarm Action for LaunchBar
by Christian Bender (@ptujec)
2022-11-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

const noValidTime = [{ title: 'No valid time!'.localize(), icon: 'alert' }];

function run(argument) {
  const list = LaunchBar.execute('/usr/bin/shortcuts', 'list')
    .trim()
    .split('\n');

  if (!list.includes('Set alarm')) {
    const response = LaunchBar.alert(
      'Shortcut missing!',
      'The action needs the shortcut named "Set alarm" to run properly. Do you want to install it now?',
      'Yes',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          'https://www.icloud.com/shortcuts/2c26f5f6e8ad4bcea0215ebf3b1c9b10'
        );

      case 1:
        break;
    }
    return;
  }

  if (argument == '') return;

  // GET TIME AND TITEL
  const timeTitleRegex = /(^\d+:?(?:\d+)?)(?:(?:\s)(.*))?/gi;

  let title = argument.replace(timeTitleRegex, '$2').trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);

  let time = argument.replace(timeTitleRegex, '$1').trim();

  // TIME CHECKS
  if (/[^0-9:]/.test(time)) return noValidTime; // only numbers and ":"
  const digits = time.match(/\d/g).join('');
  const num = parseInt(digits);
  if (digits.length > 4) return noValidTime;
  if (num < 0 || num > 2359) return noValidTime;

  // DEAL WITH HOUR MINUTES SEPARATOR
  if (!time.includes(':')) {
    if (time.length < 3) {
      if (num > 23) return noValidTime;
      time += ':00';
    } else if (time.length == 3) {
      time = time.replace(/^(\d\d)/, '$1:') + '0';
    } else if (time.length == 4) {
      time = time.replace(/^(\d\d)/, '$1:');
    }
  }

  // ADD ZEROS FOR MINUTES
  const minutes = time.split(':')[1];
  if (minutes.length > 2) return noValidTime;
  if (minutes > 59) return noValidTime;

  if (minutes.length == 0) {
    time = time + '00';
  }
  if (minutes.length == 1) {
    if (minutes > 5) return noValidTime;
    time = time + '0';
  }

  return [
    {
      title: time,
      subtitle: title ? title : undefined,
      alwaysShowsSubtitle: true,
      icon: 'com.apple.clock',
      action: 'setTime',
      actionArgument: time + ' ' + title,
      actionRunsInBackground: true,
    },
  ];
}

function setTime(time) {
  LaunchBar.hide();
  LaunchBar.executeAppleScript(
    `tell application "Shortcuts Events" to run shortcut "Set alarm" with input "${time}"` +
      (LaunchBar.options.commandKey
        ? '\ntell application "Clock" to activate'
        : '')
  );
}
