// LaunchBar Action Script

function runWithString(argument) {
  if (argument == '') {
    return;
  }
  var data = HTTP.getJSON(
    'https://api.ardmediathek.de/search-system/mediathek/suggestions?query=' +
      encodeURI(argument) +
      '&resultCount=20'
  );

  //   File.writeJSON(data, Action.supportPath + '/test.json');

  var suggestions = [];
  data.data.forEach(function (item) {
    var pushData = {
      title: item.title,
      icon: 'iconTemplate',
    };
    if (item.type != 'Item' && item.type != '[null]') {
      pushData.label = item.type;
    }

    suggestions.push(pushData);
  });

  return suggestions;
}
