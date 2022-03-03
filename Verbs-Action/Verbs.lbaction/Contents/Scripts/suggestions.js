// LaunchBar Action Script

function run(argument) {
  if (argument != '') {
    var contents = HTTP.getJSON(
      'https://www.the-conjugation.com/ajx/moteur.php?o=verbeAutoComplete&q=' +
        argument +
        '&l=en'
    ).data;

    var suggestions = [];
    contents.forEach(function (item) {
      // item = item.replace(/^to /, '');
      item = item.split('to ')[1];

      if (item.startsWith(argument)) {
        suggestions.push({
          title: item,
          icon: 'Template',
        });
      }
    });

    suggestions.sort(function (a, b) {
      return a.title.length - b.title.length || a.title.localeCompare(b.title);
    });

    return suggestions;
  }
}
