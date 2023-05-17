/* 
Arc History Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  var json = LaunchBar.execute('/bin/sh', './default.sh');

  json = JSON.parse(json);

  json.forEach(function (item) {
    item.subtitle = item.url;
  });

  return json;
}
