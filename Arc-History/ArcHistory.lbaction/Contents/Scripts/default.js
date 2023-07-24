/* 
Arc History Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run() {
  let json = LaunchBar.execute('/bin/sh', './default.sh');
  json = JSON.parse(json);

  return json.map((item) => ({
    title: item.title,
    subtitle: item.url,
    action: 'open',
    actionArgument: item.url,
    alwaysShowsSubtitle: true,
    icon: 'URLTemplate',
  }));
}

function open(url) {
  LaunchBar.openURL(url, 'Arc');
}
