/* 
Show/dismiss notifications
by Christian Bender @ptujec

requires macOS 15 

Sources:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://apple.stackexchange.com/questions/408019/dismiss-macos-big-sur-notifications-with-keyboard 
- https://www.reddit.com/r/applescript/comments/jxhm19/clear_all_notifications_with_single_script_on_big/gig3phd/
- https://gist.github.com/lancethomps/a5ac103f334b171f70ce2ff983220b4f
- https://github.com/prenagha/launchbar/blob/main/Dismiss%20Notifications.lbaction/Contents/Scripts/dismiss.applescript
- https://forum.keyboardmaestro.com/t/clear-notifications-in-big-sur/20327/6 
*/

String.prototype.localizationTable = 'default';

function run(argument) {
  return show();
}

function actionOptions() {
  return [
    {
      title: 'Dismiss notifications'.localize(),
      icon: 'notiTemplate',
      action: 'close',
      actionRunsInBackground: true,
    },
    {
      title: 'Show more'.localize(),
      icon: 'moreTemplate',
      action: 'show',
    },
    {
      title: 'Show less'.localize(),
      icon: 'lessTemplate',
      action: 'showLess',
    },
    {
      title: 'Open most recent'.localize(),
      icon: 'openTemplate',
      action: 'openAction',
      actionRunsInBackground: true,
    },
    {
      title: 'Show more actions'.localize(),
      icon: 'actionsTemplate',
      action: 'getActions',
    },
  ];
}

function show() {
  const output = LaunchBar.executeAppleScriptFile('./show.applescript').trim();

  if (output == 'success') {
    return actionOptions();
  } else if (output == 'fail') {
    close();
  } else {
    return { title: output, icon: 'alert' };
  }
}

function close() {
  LaunchBar.hide();
  LaunchBar.executeAppleScriptFile('./close.applescript');
}

function showLess() {
  LaunchBar.executeAppleScriptFile('./less.applescript');
  return actionOptions();
}

function openAction() {
  LaunchBar.hide();
  LaunchBar.executeAppleScriptFile('./open.applescript');
}

function getActions() {
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
