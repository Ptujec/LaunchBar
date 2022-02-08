// LaunchBar Action Script

function runWithString(string) {
  var data = HTTP.getJSON(
    'https://api.rtvslo.si/news/getSearchKeywords?client_id=82013fb3a531d5414f478747c1aca622&pageNumber=0&pageSize=7&q=' +
      encodeURI(string)
  ).data.response.results;
  // LaunchBar.alert(JSON.stringify(data));

  var suggestions = [];
  data.forEach(function (item) {
    suggestions.push({
      title: item.title,
      icon: 'icon',
    });
  });

  return suggestions;
}
