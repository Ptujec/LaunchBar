/* 
Wikipedia (EN) Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-25

- https://en.wikipedia.org/api/rest_v1/#/Page%20content

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (!LaunchBar.options.commandKey) {
    LaunchBar.openURL(
      'http://en.wikipedia.org/wiki/' + encodeURIComponent(argument)
    );
  } else {
    var extract = HTTP.getJSON(
      'https://en.wikipedia.org/api/rest_v1/page/summary/' +
        encodeURIComponent(argument)
    );

    var result = extract.data.extract;

    if (result != undefined) {
      result = result.replace(/\n/g, ' ');

      display(result);
    } else {
      LaunchBar.openURL(
        'http://en.wikipedia.org/wiki/' + encodeURIComponent(argument)
      );
    }
  }
}

const lineLength = 68;
const max = 948;

function display(argument) {
  var argumentLength = argument.length;

  if (argumentLength > max) {
    argument = argument.substring(0, 949) + '…';
  }

  var lines = fold(argument, lineLength);

  LaunchBar.displayInLargeType({
    string: lines.join('\n').replace(/^\s/gm, ''),
  });
}

function fold(s, n, a) {
  a = a || [];
  if (s.length <= n) {
    a.push(s);
    return a;
  }
  var line = s.substring(0, n);
  var lastSpaceRgx = /\s(?!.*\s)/;
  var idx = line.search(lastSpaceRgx);
  var nextIdx = n;
  if (idx > 0) {
    line = line.substring(0, idx);
    nextIdx = idx;
  }
  a.push(line);
  return fold(s.substring(nextIdx), n, a);
}
