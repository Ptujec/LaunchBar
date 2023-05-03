/* 
Neeva Search Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (argument != undefined && argument.trim().length == 0) {
    return;
  }

  argument = argument.replace(/\s+/g, '+');

  var data = HTTP.getJSON(
    'https://neeva.com/suggest?q=' + argument + '&src=typedquery'
  );

  if (data.response.status != 200) {
    return;
  }

  var suggestions = [];
  data.data[1].forEach(function (item) {
    suggestions.push({
      title: item,
      icon: 'iconTemplate',
    });
  });

  return suggestions;
}
