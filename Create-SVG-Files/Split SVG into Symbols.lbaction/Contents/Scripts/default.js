// LaunchBar Action Script

function run(path) {
  if (!path.toString().endsWith('.svg')) {
    LaunchBar.alert('Wrong file format!');
    LaunchBar.hide();
    return;
  }
  var svg = File.readText(path);

  var symbols = svg.match(/<symbol (.|\n)*?<\/symbol>/g);

  if (symbols == undefined) {
    return;
  }

  symbols = [...new Set(symbols)];

  var paths = [];
  symbols.forEach(function (item) {
    if (item.includes('<path')) {
      if (item.includes('<title>')) {
        var name = item
          .match(/<title>(.*?)<\/title>/)[1]
          .trim()
          .replace(/\s/g, '_')
          .replace(/:/g, '');
      } else {
        var name = item.match(
          /<symbol(?:.|\n)*?id="(.*?)"(?:.|\n)*?<\/symbol>/
        )[1];
      }

      if (item.includes('xmlns')) {
        var code = item
          .replace(/<symbol/, '<svg')
          .replace(/<\/symbol>/g, '</svg>');
      } else {
        var code = item
          .replace(/<symbol/, '<svg xmlns="http://www.w3.org/2000/"')
          .replace(/<\/symbol>/g, '</svg>');
      }

      // code = code.replace(/<\/?(?:g|defs|clipPath|use|rect)(.|\n)*?>/g, '');

      var pathString = path.toString();

      var fileLocation = pathString.replace('.svg', '') + '_' + name + '.svg';

      File.writeText(code, fileLocation);

      paths.push({
        path: fileLocation,
      });
    }
  });

  return paths;
}
