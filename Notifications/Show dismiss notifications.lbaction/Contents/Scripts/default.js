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
  const output = LaunchBar.executeAppleScriptFile('./show.applescript').trim();

  if (output == 'success') return actionOptions();

  LaunchBar.hide();
  LaunchBar.executeAppleScriptFile('./close.applescript');
}

function actionOptions() {
  return [
    {
      title: 'Dismiss notifications'.localize(),
      icon: 'notiTemplate',
      action: 'closeAction',
      actionRunsInBackground: true,
    },
    {
      title: 'Show more'.localize(),
      icon: 'moreTemplate',
      action: 'showMore',
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

function closeAction() {
  LaunchBar.hide();
  LaunchBar.executeAppleScriptFile('./close.applescript');
}

function showLess() {
  LaunchBar.executeAppleScriptFile('./less.applescript');
  return actionOptions();
}

function showMore() {
  const output = LaunchBar.executeAppleScriptFile('./show.applescript').trim();

  if (output == 'success') return actionOptions();
}

function openAction() {
  LaunchBar.hide();
  LaunchBar.executeAppleScriptFile('./open.applescript');
}

function getActions() {
  const actions = LaunchBar.executeAppleScriptFile('./getActions.applescript')
    .trim()
    .split(',');

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
  // LaunchBar.hide()
  LaunchBar.executeAppleScriptFile('./runAction.applescript', argument);
}
