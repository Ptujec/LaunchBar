/*
CleanShot X Functions
- https://cleanshot.com/docs/api
*/

function run() {
  return [
    {
      title: 'Capture Area', // .localize()
      icon: 'areaTemplate',
      action: 'doStuff',
      actionArgument: 'cleanshot://capture-area',
      actionRunsInBackground: true,
    },
    {
      title: 'Capture Previous Area', // .localize()
      icon: 'previousTemplate',
      action: 'doStuff',
      actionArgument: 'cleanshot://capture-previous-area',
      actionRunsInBackground: true,
    },
    {
      title: 'Capture Fullscreen', // .localize()
      icon: 'camTemplate',
      action: 'doStuff',
      actionArgument: 'cleanshot://capture-fullscreen',
      actionRunsInBackground: true,
    },
    {
      title: 'Capture Window', // .localize()
      icon: 'windowTemplate',
      action: 'doStuff',
      actionArgument: 'cleanshot://capture-window',
      actionRunsInBackground: true,
    },
    {
      title: 'Scrolling Capture', // .localize()
      icon: 'arrowTemplate',
      action: 'doStuff',
      actionArgument: 'cleanshot://scrolling-capture',
      actionRunsInBackground: true,
    },
    {
      title: 'Self-Timer', // .localize()
      icon: 'timerTemplate',
      action: 'doStuff',
      actionArgument: 'cleanshot://self-timer',
      actionRunsInBackground: true,
    },
    {
      title: 'Capture Text (OCR)', // .localize()
      icon: 'textTemplate',
      action: 'doStuff',
      actionArgument: 'cleanshot://capture-text',
      actionRunsInBackground: true,
    },
    {
      title: 'Record Screen (Video/GIF)', // .localize()
      icon: 'videoTemplate',
      action: 'doStuff',
      actionArgument: 'cleanshot://record-screen',
      actionRunsInBackground: true,
    },
    {
      title: 'Toggles Desktop icons visiblity', // .localize()
      icon: 'hideTemplate',
      action: 'doStuff',
      actionArgument: 'cleanshot://toggle-desktop-icons',
      actionRunsInBackground: true,
    },
    {
      title: 'Restore recently closed item', // .localize()
      icon: 'restoreTemplate',
      action: 'doStuff',
      actionArgument: 'cleanshot://restore-recently-closed',
      actionRunsInBackground: true,
    },
  ];
}

function doStuff(actionArgument) {
  LaunchBar.hide();
  LaunchBar.executeAppleScript('delay 0.1');
  LaunchBar.openURL(actionArgument);
}
