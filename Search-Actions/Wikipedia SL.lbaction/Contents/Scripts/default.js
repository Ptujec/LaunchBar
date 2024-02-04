/* 
Wikipedia (SL) Action for LaunchBar
by Christian Bender (@ptujec)
2024-02-04

- https://en.wikipedia.org/api/rest_v1/#/Page%20content

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(
      'http://sl.wikipedia.org/wiki/' + encodeURIComponent(argument)
    );
  } else {
    const extract = HTTP.getJSON(
      'https://sl.wikipedia.org/api/rest_v1/page/summary/' +
        encodeURIComponent(argument)
    );

    if (extract.error) {
      LaunchBar.alert(extract.error);
      return;
    }

    let result = extract.data.extract;

    if (result) {
      LaunchBar.displayInLargeType({ string: result });
    } else {
      LaunchBar.openURL(
        'http://sl.wikipedia.org/wiki/' + encodeURIComponent(argument)
      );
    }
  }
}
