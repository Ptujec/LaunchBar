// Speedtest by Christian Bender @ptujec
// macOS 12 required
// Some background: https://danpetrov.xyz/macos/2021/11/14/analysing-network-quality-macos.html

function run() {
  if (LaunchBar.options.alternateKey) {
    LaunchBar.executeAppleScript(
      'tell application "Terminal"',
      'do script "networkQuality"',
      'activate',
      'end tell'
    );
  } else {
    LaunchBar.displayNotification({
      title: 'Speedtest',
      string: 'Test started … may take a few seconds',
    });

    var noti = LaunchBar.execute('/usr/bin/networkQuality').trim().split('\n');

    var up = noti[1] // Upload capacity
      .match(/\d+\.\d+/);

    up = Math.round(up).toFixed() + ' Mbps';

    var down = noti[2] // Download capacity
      .match(/\d+\.\d+/);

    down = Math.round(down).toFixed() + ' Mbps';

    const osVersion = LaunchBar.systemVersion.match(/^\d\d/);

    if (osVersion > 12) {
      var resp = noti[3] // Responsiveness
        .trim();
    } else {
      var resp = noti[5] // Responsiveness
        .trim();
    }

    LaunchBar.executeAppleScript(
      'do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf"'
    ); // Play Sound

    LaunchBar.displayNotification({
      title: 'Speedtest',
      string: '▼ ' + down + ' ▲ ' + up + '\n' + resp,
    });
  }
}
