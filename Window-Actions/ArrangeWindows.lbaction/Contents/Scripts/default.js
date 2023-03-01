/* 
Arrange Windows Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-27

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Helpful Info for getting applications in the order they are listed in the appswitcher:
- https://www.macscripter.net/t/second-frontmost-application/73701/24
*/

String.prototype.localizationTable = 'default';

function run() {
  if (LaunchBar.options.spaceKey || LaunchBar.options.commandKey) {
    var options = [
      {
        title: '3 windows'.localize(),
        icon: '3Template',
        action: 'arrange3',
        actionRunsInBackground: true,
      },
      {
        title: '4 windows'.localize(),
        icon: '4Template',
        action: 'arrange4',
        actionRunsInBackground: true,
      },
    ];
    return options;
  } else {
    LaunchBar.hide();
    LaunchBar.executeAppleScriptFile('./default.applescript');
  }
}

function arrange3() {
  LaunchBar.hide();
  LaunchBar.executeAppleScriptFile('./3.applescript');
}

function arrange4() {
  LaunchBar.hide();
  LaunchBar.executeAppleScriptFile('./4.applescript');
}
