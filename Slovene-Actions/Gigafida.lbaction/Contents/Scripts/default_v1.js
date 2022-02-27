// LaunchBar Action for Gigafide - Korpus pisne standardne slovenščine (https://viri.cjvt.si/gigafida/)

function run(argument) {
  if (argument != undefined) {
    argument = argument.trim().replace(/\s+/g, '+');

    if (LaunchBar.options.shiftKey) {
      argument = '"' + argument + '"';
    }

    //  Main action
    var mainURL =
      'https://viri.cjvt.si/gigafida/Concordance/Search?Query=' +
      encodeURI(argument);
    var dataURL =
      'https://viri.cjvt.si/gigafida/Concordance/Export?Rows=15&Query=' +
      encodeURI(argument) +
      '&Type=FirstRows';

    if (LaunchBar.options.commandKey) {
      LaunchBar.hide();
      LaunchBar.openURL(mainURL);
    } else {
      var data = HTTP.loadRequest(dataURL, {
        timeout: 5.0,
        method: 'GET',
        resultType: 'text',
      }).data.split('\n');

      if (data[3].endsWith('0')) {
        var response = LaunchBar.alert(
          'Gigafida: Ni bilo zadetkov!',
          'Lahko poskusite na spletni strani Gigafida, "Nova beseda" (ZRC SAZU) ali na Googlu?',
          'Gigafia spletna stran',
          'Nova beseda (ZRC SAZU)',
          'Google',
          'Cancel'
        );
        switch (response) {
          case 0:
            LaunchBar.openURL(mainURL);
            break;
          case 1:
            LaunchBar.openURL(
              'http://bos.zrc-sazu.si/c/ada.exe?hits_shown=100&clm=22&crm=22&expression=' +
                encodeURI(argument) +
                '&clm=22&crm=22&wth=0&hits_shown=100&sel=%28all%29&name=a_si'
            );
            break;
          case 2:
            LaunchBar.openURL(
              'http://www.google.si/search?q=' + encodeURIComponent(argument)
            );
            break;
          case 3:
            break;
        }
        return;
      }

      var stats = data[3].split('\t')[1].split('od');

      var shownHits = stats[0];
      var totalHits = stats[1];

      if (parseInt(shownHits) > parseInt(totalHits)) {
        var shownHits = totalHits;
      }

      var result = [
        {
          // title: data[3].replace(/\t/, ': '),
          title: 'Število zapisov: ' + shownHits + ' od ' + totalHits,
          subtitle: data[4].replace(/\t/, ''),
          icon: 'pieTemplate',
          url: mainURL,
        },
      ];
      for (var i = 8; i < data.length - 1; i++) {
        var columns = data[i].split('\t');
        var left = columns[0].trim();
        var middle = columns[1].trim();
        var right = columns[2].trim();

        var pushData = {
          icon: 'resultTemplate',
          action: 'openURL',
          actionArgument: mainURL,
        };

        if (left != '') {
          pushData.title = left;
          pushData.subtitle = middle + ' ' + right;
        } else {
          pushData.title = middle + ' ' + right;
        }

        result.push(pushData);
      }
      return result;
    }
  } else {
    // No argument passed, just open the website:
    LaunchBar.hide();
    LaunchBar.openURL('https://viri.cjvt.si/gigafida/');
  }
}

function openURL(url) {
  LaunchBar.hide();
  LaunchBar.openURL(url);
}
