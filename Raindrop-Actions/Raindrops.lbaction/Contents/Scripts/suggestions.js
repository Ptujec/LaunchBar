/*
Raindrops - Raindrop.io Action for LaunchBar
Suggestions (Tags)

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.raindrop.io
*/

function runWithString(string) {
  var rData = HTTP.getJSON(
    encodeURI(
      'https://api.raindrop.io/rest/v1/tags/0?access_token=' +
        Action.preferences.apiKey
    )
  );

  var first = [];
  var second = [];
  for (var iData = 0; iData < rData.data.items.length; iData++) {
    var suggestion = rData.data.items[iData]._id;
    if (suggestion.toLowerCase().includes(string.toLowerCase())) {
      if (suggestion.toLowerCase().startsWith(string.toLowerCase())) {
        first.push({
          title: suggestion,
          icon: 'tagTemplate',
        });
      } else {
        second.push({
          title: suggestion,
          icon: 'tagTemplate',
        });
      }
    }
  }

  first.sort(function (a, b) {
    return a.title > b.title;
  });
  second.sort(function (a, b) {
    return a.title > b.title;
  });
  var tags = first.concat(second);

  var operators = [
    {
      title: 'type:article',
      icon: 'articleTemplate',
    },
    {
      title: 'type:document',
      icon: 'docTemplate',
    },
    {
      title: 'type:image',
      icon: 'imageTemplate',
    },
    {
      title: 'type:video',
      icon: 'videoTemplate',
    },
    {
      title: 'type:audio',
      icon: 'audioTemplate',
    },
  ];

  operators = operators.filter(function (el) {
    return el.title.includes(string);
  });

  var suggestions = operators.concat(tags);

  return suggestions;
}
