// LaunchBar Action Script

function run(argument) {
  if (argument != '') {
    var firstLetter = argument.charAt(0);
    var query = argument.replace(/\s+/g, '_');

    var data = HTTP.getJSON(
      'https://tabs.ultimate-guitar.com/static/article/suggestions/' +
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
        icon: 'ug_icon',
      });
    });

    return suggestions;
  }
}
