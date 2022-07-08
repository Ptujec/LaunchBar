/* 
SRT Timestamp Action for LaunchBar
by Christian Bender (@ptujec)
2022-07-07

srtTimestamp function:
https://stackoverflow.com/questions/46864913/converting-milliseconds-to-srt-time-using-js

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run() {
  var seconds = LaunchBar.executeAppleScript(
    'tell application "QuickTime Player"',
    '   current time of document 1',
    'end tell'
  ).trim();

  var stamp = srtTimestamp(seconds).split('.')[0];
  // LaunchBar.executeAppleScript('set the clipboard to "' + stamp + '"');

  if (LaunchBar.options.alternateKey) {
    LaunchBar.paste(stamp + ' --> ');
  } else {
    LaunchBar.paste(stamp);
  }
}

function srtTimestamp(seconds) {
  var $milliseconds = seconds * 1000;

  $seconds = Math.floor($milliseconds / 1000);
  $minutes = Math.floor($seconds / 60);
  $hours = Math.floor($minutes / 60);
  $milliseconds = $milliseconds % 1000;
  $seconds = $seconds % 60;
  $minutes = $minutes % 60;
  return (
    ($hours < 10 ? '0' : '') +
    $hours +
    ':' +
    ($minutes < 10 ? '0' : '') +
    $minutes +
    ':' +
    ($seconds < 10 ? '0' : '') +
    $seconds +
    ',' +
    ($milliseconds < 100 ? '0' : '') +
    ($milliseconds < 10 ? '0' : '') +
    $milliseconds
  );
}
