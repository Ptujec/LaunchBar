// LaunchBar Action for Gigafide - Korpus pisne standardne slovenščine (https://viri.cjvt.si/gigafida/)

function run(argument) {
  if (argument != undefined) {
    argument = argument.trim().replace(/\s+/g, '+');

    if (LaunchBar.options.controlKey) {
      argument = '"' + argument + '"';
    }

    //  Main action
    var mainURL =
      'https://viri.cjvt.si/gigafida/Concordance/Search?Query=' +
      encodeURI(argument);

    if (LaunchBar.options.commandKey) {
      LaunchBar.hide();
      LaunchBar.openURL(mainURL);
    } else {
      var data = HTTP.loadRequest(mainURL, {
        timeout: 5.0,
        method: 'GET',
        resultType: 'text',
      }).data;

      var colocationsSubfragment = data.match(
        /<div class="colocationsSubfragment">(.|\n|\r)*?<footer>/g
      );

      // LaunchBar.paste(colocationsSubfragment);

      if (colocationsSubfragment == null) {
        var response = LaunchBar.alert(
          'Gigafida: Ni bilo zadetkov!',
          'Lahko poskusite na spletni strani "Nova beseda" (ZRC SAZU) ali na Googlu?',
          'Nova beseda (ZRC SAZU)',
          'Google',
          'Cancel'
        );
        switch (response) {
          case 0:
            LaunchBar.openURL(
              'http://bos.zrc-sazu.si/c/ada.exe?hits_shown=100&clm=22&crm=22&expression=' +
                encodeURI(argument) +
                '&clm=22&crm=22&wth=0&hits_shown=100&sel=%28all%29&name=a_si'
            );
            break;
          case 1:
            LaunchBar.openURL(
              'http://www.google.si/search?q=' + encodeURIComponent(argument)
            );
            break;
          case 2:
            break;
        }
        return;
      } else {
        colocationsSubfragment = colocationsSubfragment
          .toString()
          .replace(/&#x17E;/g, 'ž')
          .replace(/&#x17D;/g, 'Ž')
          .replace(/&#x10D;/g, 'č')
          .replace(/&#x10C;/g, 'Č')
          .replace(/&#x161;/g, 'š')
          .replace(/&#x160;/g, 'Š')
          .replace(/&#x107;/g, 'ć')
          .replace(/&#xFC;/g, 'ü')
          .replace(/&#xDC;/g, 'Ü')
          .replace(/&#xF6;/g, 'ö')
          .replace(/&#xD6;/g, 'Ö')
          .replace(/&#xE4;/g, 'ä')
          .replace(/&#xC4;/g, 'Ä')
          .replace(/&#xF4;/g, 'ô')
          .replace(/&#xF3;/g, 'ó')
          .replace(/&#xE3;/g, 'ã')
          .replace(/&#xE1;/g, 'á')
          .replace(/&#xED;/g, 'í')
          .replace(/&#xE9;/g, 'é')
          .replace(/&#x2B;/g, '+')
          .replace(/&#xBB;/g, '»')
          .replace(/&#xAB;/g, '«')
          .replace(/&#x201C;/g, '“')
          .replace(/&#x201D;/g, '”')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&#x2026;/g, '…')
          .replace(/&#x2022;/g, '•')
          .replace(/&#x2013;/g, '–')
          .replace(/&#x2666/g, '♦')
          .replace(/&#xB0/g, '°')
          .replace(/&nbsp;/g, '');

        var leftText = colocationsSubfragment.match(
          /<div class="pure-u-1-2 text left">.*?<\/div>/g
        );

        var rightText = colocationsSubfragment.match(
          /<div class="pure-u-1-2 text right">.*?<\/div>/g
        );

        var result = [];
        for (var i = 0; i < rightText.length; i++) {
          var left = leftText[i].replace(/(<([^>]+)>)/g, '');
          var right = rightText[i].replace(/(<([^>]+)>)/g, '');

          var pushData = {
            icon: 'resultTemplate',
            action: 'openURL',
            actionArgument: mainURL,
          };

          if (left != '') {
            pushData.title = left;
            pushData.subtitle = right;
          } else {
            pushData.title = right;
          }

          result.push(pushData);
        }
        return result;
      }
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
