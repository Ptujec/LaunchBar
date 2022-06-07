// LaunchBar Action Script

String.prototype.localizationTable = 'default';

function runWithString(string) {
  var lines = File.readText(
    Action.path + '/Contents/Resources/suggestions.txt'
  ).split('\n');

  var suggestions = [];
  lines.forEach(function (item) {
    var title = item.localize();
    var stringParts = title.replace(/\(/g, '').split(' ');

    stringParts.forEach(function (item) {
      if (item.toLowerCase().startsWith(string.toLowerCase())) {
        if (!JSON.stringify(suggestions).includes(title)) {
          suggestions.push({
            title: title,
            icon: 'CopyActionTemplate',
          });
        }
      }
    });
  });

  return suggestions;
}
