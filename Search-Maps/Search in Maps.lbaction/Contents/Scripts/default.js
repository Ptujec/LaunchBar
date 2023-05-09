/* 
Search in Maps Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html

*/

String.prototype.localizationTable = 'default'; // For potential localization later

function run(argument) {
  argument = argument + ' ';

  var parts = argument.split(/(?: |^)(?:to|nach|von|from) /);
  var devider = argument.match(/(?: |^)(?:to|nach|von|from) /);

  if (devider != undefined) {
    devider = devider.join('').trim();

    if (devider == 'von' || devider == 'from') {
      var saddr = parts[1]; // source address
      var daddr = parts[0]; // destination add
    } else {
      var saddr = parts[0]; // source address
      var daddr = parts[1]; // destination address
    }

    if (saddr == '') {
      var url = encodeURI('http://maps.apple.com/?daddr=' + daddr);
    } else {
      var url = encodeURI(
        'http://maps.apple.com/?saddr=' + saddr + '&daddr=' + daddr
      );
    }
  } else {
    var url = 'https://maps.apple.com/?q=' + encodeURI(argument);
  }

  LaunchBar.openURL(url);
}
