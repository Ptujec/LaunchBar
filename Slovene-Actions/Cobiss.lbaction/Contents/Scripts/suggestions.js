function runWithString(string) {
  var data = HTTP.getJSON(
    'https://plus.si.cobiss.net/opac7/bib/search/autocomplete?q=' +
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
