function runWithString(argument) {
  // This is no official api. This could stop working any time...
  var result = HTTP.get(
    'http://suggestqueries.google.com/complete/search?client=chrome&q=' +
      encodeURIComponent(argument),
    3
  );

  if (result == undefined) {
    LaunchBar.log('HTTP.getJSON() returned undefined');
    return [];
  }
  if (result.error != undefined) {
    LaunchBar.log('Error in HTTP request: ' + result.error);
    return [];
  }

  var json = eval(result.data.replace('window.google.ac.h', ''));

  LaunchBar.log(json);
  LaunchBar.log(json[1][0][0]);

  var suggestionsResult = json;

  try {
    var suggestions = [];
    var i = 0;
    for (i = 0; i < suggestionsResult[1].length; i++) {
      var suggestion = suggestionsResult[1][i];
      suggestions.push({
        title: suggestion,
        icon: 'iconTemplate',
      });
    }
    return suggestions;
  } catch (exception) {
    LaunchBar.log('Exception while parsing result: ' + exception);
    return [];
  }
}
