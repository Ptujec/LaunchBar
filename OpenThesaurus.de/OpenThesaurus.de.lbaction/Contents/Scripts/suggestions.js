// LaunchBar Action Script
// Suggestions from https://dict.leo.org

function run(argument) {
  if (argument != '') {
    var data = HTTP.getJSON(
      'https://dict.leo.org/dictQuery/m-query/conf/ende/query.conf/strlist.json?q=' +
        encodeURI(argument) +
        '&shortQuery&noDescription&sideInfo=on&where=both&term=' +
        encodeURI(argument),
      3
    ).data;

    var words = data[1];
    var lang = data[4];

    var suggestions = [];
    for (var i = 0; i < words.length; i++) {
      if (lang[i] == 2) {
        suggestions.push({
          title: words[i],
          icon: 'tTemplate',
        });
      }
    }
    suggestions[suggestions.length - 1].subtitle =
      '(Alle Vorschläge von https://dict.leo.org)';

    return suggestions;
  }
}
