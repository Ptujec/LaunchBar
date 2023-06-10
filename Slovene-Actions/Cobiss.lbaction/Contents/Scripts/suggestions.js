function runWithString(string) {
  var data = HTTP.getJSON(
    'https://plus.cobiss.net/cobiss/si/sl/bib/search/autocomplete?q=' +
      encodeURI(string) +
      '&db=cobib&mat=allmaterials'
  ).data;

  var suggestions = [];
  data.forEach(function (item) {
    suggestions.push({
      title: item,
      icon: 'cobissTemplate',
    });
  });
  return suggestions;
}
