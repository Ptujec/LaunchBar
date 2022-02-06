// LaunchBar Action for Slovar sopomenk sodobne slovenščine (https://viri.cjvt.si/sopomenke/slv/)

function run(argument) {
  if (argument != undefined) {
    argument = argument.trim();
    if (argument != '') {
      var result = HTTP.getJSON(
        'https://viri.cjvt.si/sopomenke/ajax_api/v1/slv/sinonimni/search/' +
          encodeURIComponent(argument),
        3
      ).data;

      if (result != undefined) {
        var suggestions = [];
        for (var i = 0; i < result.length; i++) {
          var entry = result[i].headword;
          var id = result[i].id;
          var mainURL =
            'https://viri.cjvt.si/sopomenke/slv/state?mw=' +
            entry +
            '&mid=' +
            id +
            '&source=main_page';
          var dataURL =
            'https://viri.cjvt.si/sopomenke/ajax_api/v1/slv/synonym/download/' +
            id;

          suggestions.push({
            title: entry,
            icon: 'sTemplate',
            action: 'getSynonyms',
            actionArgument: {
              entry: entry,
              mainURL: mainURL,
              dataURL: dataURL,
            },
          });
        }
      }
      return suggestions;
    }
  } else {
    // No argument passed, just open the website:
    LaunchBar.hide();
    LaunchBar.openURL('http://viri.cjvt.si/sopomenke/slv/');
  }
}

function getSynonyms(dict) {
  var entry = dict.entry;
  var mainURL = dict.mainURL;
  var dataURL = dict.dataURL;

  var data = HTTP.loadRequest(dataURL, {
    timeout: 5.0,
    method: 'GET',
    resultType: 'text',
  }).data.split('\n');

  var result = [];
  for (var i = 9; i < data.length - 1; i++) {
    var columns = data[i].split('\t');

    var synonym = columns[0];
    var type = columns[1];
    var frequency = columns[4];

    if (frequency != '' && frequency != '-') {
      var label = type + ' (' + frequency + ')';
    } else {
      var label = type;
    }

    if (type == 'uporabniški') {
      var label = undefined;
      var icon = 'synonymUserTemplate';
    } else {
      var icon = 'synonymTemplate';
    }

    result.push({
      title: synonym,
      label: label,
      badge: entry,
      icon: icon,
      action: 'openURL',
      actionArgument: {
        title: synonym,
        url: mainURL,
      },
    });
  }

  return result;
}

function openURL(dict) {
  if (LaunchBar.options.shiftKey) {
    LaunchBar.paste(dict.title);
  } else {
    LaunchBar.hide();
    LaunchBar.openURL(encodeURI(dict.url));
  }
}
