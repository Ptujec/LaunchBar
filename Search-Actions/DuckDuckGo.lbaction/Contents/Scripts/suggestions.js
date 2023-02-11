/* 
DuckDuckGo Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function runWithString(string) {
  if (string == '') {
    return;
  }

  var data = HTTP.getJSON(
    'https://duckduckgo.com/ac/?q=' + encodeURI(string) + '&kl=wt-wt'
  );

  if (data.response.status != 200) {
    return;
  }

  var suggestions = [];

  data.data.forEach(function (item) {
    suggestions.push({
      title: item.phrase,
      icon: 'icon',
    });
  });

  return suggestions;
}
