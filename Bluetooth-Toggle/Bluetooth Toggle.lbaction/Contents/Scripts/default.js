/* 
Bluetooth Toggle Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-28

Tested on macOS 15.3.1

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

function run() {
  const result = LaunchBar.execute(
    '/usr/sbin/system_profiler',
    'SPBluetoothDataType'
  );

  const state = result.match(/State: (On|Off)/)?.[1];

  return {
    title: 'Bluetooth: ' + state.localize(),
    icon: state == 'On' ? 'onTemplate' : 'offTemplate',
    action: 'toggle',
  };
}

function toggle() {
  LaunchBar.executeAppleScriptFile('./toggle.applescript');
  return run();
}
