function runWithString(argument) {
  if (argument != undefined) {
    argument = argument.trim();
    if (argument != '') {
      var result = HTTP.getJSON(
        'http://www.fran.si/ajax/iskanje/autocomplete?query=' +
          encodeURIComponent(argument) +
          '&dictionaries=133',
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

      try {
        var suggestions = [];
        var i = 0;
        for (i = 0; i < result.data.length; i++) {
          var suggestion = result.data[i];
          suggestions.push({
            title: suggestion,
            icon: 'sTemplate.png',
          });
        }
        return suggestions;
      } catch (exception) {
        LaunchBar.log('Exception while parsing result: ' + exception);
        return [];
      }
    }
  }
}
