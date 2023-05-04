/* 
Maps Route Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- autocomplete for places
*/

function run(argument) {
  var parts = argument.split(/ to | nach | - /);

  var saddr = parts[0]; // source address
  var daddr = parts[1]; // destination address

  if (daddr != undefined) {
    var url = encodeURI(
      'http://maps.apple.com/?saddr=' + saddr + '&daddr=' + daddr
    );
  } else {
    var url = 'https://maps.apple.com/?q=' + encodeURI(argument);
  }

  LaunchBar.hide();
  LaunchBar.openURL(url);
}
