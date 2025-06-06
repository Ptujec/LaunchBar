/*
Speedtest Action for LaunchBar
by Christian Bender (@ptujec)
2025-05-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run() {
  if (LaunchBar.options.commandKey) {
    return LaunchBar.executeAppleScript(
      'tell application "Terminal"',
      'do script "networkQuality"',
      'activate',
      'end tell'
    );
  }

  LaunchBar.displayNotification({
    title: 'Speedtest',
    string:
      'Test started … may take a few seconds.\nHold commmand key to open Terminal instead!',
  });

  const output = LaunchBar.execute('/usr/bin/networkQuality', '-c').trim();
  const json = JSON.parse(output);

  if (json.error_code) {
    LaunchBar.displayNotification({
      title: 'Speedtest',
      string: `Error ${json.error_code}: Could not run the speed test.\nTry again holding down the command key!`,
    });
    return;
  }

  const startDate = new Date(json.start_date);
  const endDate = new Date(json.end_date);
  const timeDiff = (endDate - startDate) / 1000;

  const down = `▼ ${Math.round(json.dl_throughput / 1000000)} Mbps`;
  const up = `▲ ${Math.round(json.ul_throughput / 1000000)} Mbps`;
  const resp = `Responsiveness: ${json.responsiveness.toFixed(1)} milliseconds`;
  const time = `Runtime: ${timeDiff.toFixed(1)} seconds`;

  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  LaunchBar.displayNotification({
    title: 'Speedtest',
    string: `${down} ${up}\n${resp}\n${time}`,
  });
}
