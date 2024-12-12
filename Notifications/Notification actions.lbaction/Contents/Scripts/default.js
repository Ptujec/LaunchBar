/* 
Notification Actions Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15
requires macOS 15 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run() {
  const output = LaunchBar.executeAppleScriptFile('./getActions.applescript')
    .trim()
    .split(',');

  if (output[0].startsWith('Error')) return { title: output[0], icon: 'alert' };

  return output
    .map((action) => ({
      title: action.trim(),
      icon: 'actionTemplate',
      action: 'runAction',
      actionArgument: action.trim(),
      actionRunsInBackground: true,
    }))
    .reverse();
}

function runAction(argument) {
  LaunchBar.hide();
  LaunchBar.executeAppleScriptFile('./runAction.applescript', argument);
}
