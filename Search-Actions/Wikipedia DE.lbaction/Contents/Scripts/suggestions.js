/* 
Wikipedia (DE) Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-25

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function runWithString(argument) {
  if (argument == '') {
    return;
  }

  var data = HTTP.getJSON(
    'https://de.wikipedia.org/w/rest.php/v1/search/title?q=' +
      encodeURI(argument) +
      '&limit=20'
  );

  if (data.response.status != 200) {
    return;
  }

  var suggestions = [];
  var pages = data.data.pages;

  pages.forEach(function (item) {
    pushData = {
      title: item.title,
      icon: 'wikiconTemplate',
    };

    if (item.description != null) {
      pushData.subtitle = item.description;
    }

    suggestions.push(pushData);
  });

  return suggestions;
}
