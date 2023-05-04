/* 
Search in Maps Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- autocomplete for places … maybe with swift 
- stops 

*/

function run(argument) {
  //
  if (argument != undefined && argument.trim().length == 0) {
    return;
  }

  var parts = argument.split(/ to | nach | - /);

  var devider = argument.match(/ to | nach | - /);

  if (devider != undefined) {
    devider = devider.join('').trim();
  }

  var saddr = parts[0]; // source address
  var daddr = parts[1]; // destination address

  if (daddr != undefined) {
    return [
      {
        title: saddr,
        icon: 'circleTemplate',
      },
      {
        title: devider,
        icon: 'dotsTemplate',
      },
      {
        title: daddr,
        icon: 'pinTemplate',
      },
    ];
  } else {
    var result = HTTP.get(
      'http://suggestqueries.google.com/complete/search?client=chrome&q=' +
        encodeURIComponent(argument),
      3
    );

    if (result == undefined || result.error != undefined) {
      return;
    }

    var suggestionsResult = eval(result.data.replace('window.google.ac.h', ''));

    try {
      var suggestions = [];
      var i = 0;
      for (i = 0; i < suggestionsResult[1].length; i++) {
        var suggestion = suggestionsResult[1][i];
        suggestions.push({
          title: suggestion,
          icon: 'pinTemplate',
        });
      }
      return suggestions;
    } catch {
      return;
    }
  }
}
