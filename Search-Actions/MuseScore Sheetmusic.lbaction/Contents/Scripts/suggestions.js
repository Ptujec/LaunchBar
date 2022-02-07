// LaunchBar Action Script

function run(argument) {
  if (argument != '') {
    var firstLetter = argument.charAt(0);
    var query = argument.replace(/\s+/g, '_');

    var data = HTTP.getJSON(
      'https://musescore.com/static/musescore/search/suggestions/' +
        firstLetter +
        '/' +
        encodeURI(query) +
        '.js',
      3
    ).data.suggestions;

    var suggestions = [];
    data.forEach(function (item) {
      suggestions.push({
        title: item,
        icon: 'notesheetTemplate',
      });
    });

    return suggestions;
  }
}
