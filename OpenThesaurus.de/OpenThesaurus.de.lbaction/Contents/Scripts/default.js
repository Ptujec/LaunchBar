/* LaunchBar Action Script
https://www.openthesaurus.de/about/api#json
*/

function run(argument) {
  // var badge = argument.charAt(0).toUpperCase() + argument.slice(1);
  var badge = argument;

  var data = HTTP.loadRequest(
    'https://www.openthesaurus.de/synonyme/search?q=' +
      encodeURI(argument) +
      '&format=application/json',
    {
      timeout: 5.0,
      method: 'GET',
      resultType: 'text',
    }
  ).data;

  // LaunchBar.alert(JSON.stringify(JSON.parse(data)));

  var synsets = JSON.parse(data).synsets;

  var result = [];
  var checkTitles = [];
  synsets.forEach(function (item) {
    var terms = item.terms;

    terms.forEach(function (item) {
      var pushData = {
        title: item.term,
        icon: 'synonymTemplate',
        badge: badge,
        url: 'https://www.openthesaurus.de/synonyme/' + encodeURI(argument),
      };
      var level = item.level;

      if (level != undefined) {
        pushData.label = level;
      }

      if (!checkTitles.includes(item.term)) {
        result.push(pushData);
        checkTitles.push(item.term);
      }
    });
  });

  result.sort(function (a, b) {
    return a.title.localeCompare(b.title);
  });

  if (result.length > 0) {
    return result;
  } else {
    LaunchBar.alert('Kein Ergebnis');
  }
}
