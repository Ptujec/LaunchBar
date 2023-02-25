/* 
Wikipedia (DE) Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-25

- https://en.wikipedia.org/api/rest_v1/#/Page%20content

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (!LaunchBar.options.commandKey) {
    LaunchBar.openURL(
      'http://de.wikipedia.org/wiki/' + encodeURIComponent(argument)
    );
  } else {
    var extract = HTTP.getJSON(
      'https://de.wikipedia.org/api/rest_v1/page/summary/' +
        encodeURIComponent(argument)
    );

    var result = extract.data.extract;

    if (result != undefined) {
      result = result.replace(/\n/g, ' ');
      LaunchBar.performAction('Text vergrößern', result);
    } else {
      LaunchBar.openURL(
        'http://de.wikipedia.org/wiki/' + encodeURIComponent(argument)
      );
    }
  }
}
