/* 
Kagi.com Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function runWithString(string) {
  var apiToken = Action.preferences.apiToken;

  if (string == '' || apiToken == undefined) {
    return;
  }

  var data = HTTP.getJSON(
    'https://kagi.com/autosuggest?q=' + encodeURI(string),
    {
      headerFields: {
        Cookie: 'kagi_session=' + apiToken,
      },
    }
  );

  if (data.response.status != 200) {
    return;
  }

  var suggestions = [];

  data.data.forEach(function (item) {
    var pushData = {
      title: item.t,
      icon: 'iconTemplate',
    };

    // if (item.txt != null) {
    //   pushData.label = item.txt;
    // }

    suggestions.push(pushData);
  });

  return suggestions;
}
