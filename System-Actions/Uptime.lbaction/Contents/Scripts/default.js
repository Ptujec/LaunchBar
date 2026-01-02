/* 
Uptime Action for LaunchBar
by Christian Bender (@ptujec)
2026-01-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- more details (sleep, wake …)?
*/

function run() {
  const result = LaunchBar.execute('/bin/bash', './main.sh');
  // File.writeText(result, `${Action.supportPath}/test.json`);

  const json = JSON.parse(result);

  const uptimeInfo = json['uptime-information'];
  const lastReboot = json['last-information'].last[0]['login-time'];

  const title = uptimeInfo['uptime-human'].replace(/,$/, '').trim();

  return {
    title,
    badge: lastReboot,
    icon: 'symbol:clock',
    action: 'sleep',
  };
}

function sleep() {
  LaunchBar.hide();
  LaunchBar.execute('/usr/bin/pmset', 'sleepnow');
}
