/* 
Notification Actions Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-15

requires macOS 15 

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run() {
  const actions = LaunchBar.executeAppleScriptFile('./getActions.applescript')
    .trim()
    .split(',');

  if (actions == '') {
    LaunchBar.hide();
    return;
  }

  const result = [];

  for (let action of actions) {
    action = action.trim();
    if (
      action != 'AXScrollToVisible' &&
      action != 'drücken' &&
      action != 'press'
    ) {
      result.push({
        title: action,
        icon: 'actionTemplate',
        action: 'runAction',
        actionArgument: action,
        actionRunsInBackground: true,
      });
    }
  }
  return result.reverse();
}

function runAction(argument) {
  LaunchBar.hide();
  LaunchBar.executeAppleScriptFile('./runAction.applescript', argument);
}
