/* 
Speedtest Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-06

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run() {
  if (LaunchBar.options.alternateKey) {
    return LaunchBar.executeAppleScript(
      'tell application "Terminal"',
      'do script "networkQuality"',
      'activate',
      'end tell'
    );
  }

  LaunchBar.displayNotification({
    title: 'Speedtest',
    string: 'Test started … may take a few seconds',
  });

  const output = LaunchBar.execute('/usr/bin/networkQuality')
    .trim()
    .split('\n');

  const up = Math.round(output[1].match(/\d+\.\d+/)[0]).toFixed() + ' Mbps';
  const down = Math.round(output[2].match(/\d+\.\d+/)[0]).toFixed() + ' Mbps';

  const osVersion = LaunchBar.systemVersion.match(/^\d\d/);
  const resp = osVersion > 12 ? output[3].trim() : output[5].trim();

  LaunchBar.executeAppleScript(
    'do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf"'
  );

  LaunchBar.displayNotification({
    title: 'Speedtest',
    string: '▼ ' + down + ' ▲ ' + up + '\n' + resp,
  });
}
