/* Linguee LaunchBar Action

Add in v2:
- tag_wordtype support?
- play mp3? https://www.linguee.com/mp3/EN_US/12/1253208465b1efa876f982d8a9e73eef-100.mp3
*/

String.prototype.localizationTable = 'default';

var language = Action.preferences.language;
if (language == undefined) {
  var language = 'english-german';
}

function run(argument) {
  if (argument != null) {
    var data =
      HTTP.get(
        'https://www.linguee.com/' +
          language +
          '/search?qe=' +
          encodeURI(argument) +
          '&source=auto'
      ).data + "<div class='main_row'>";

    var matches = data.match(
      /<div class='main_item'(.|\n|\r)+?<div class='main_row'>/gi
    );

    var result = [];
    matches.forEach(function (item) {
      item = item
        .replace(/<span class='sep'>&middot;<\/span>/g, '')
        .replace(/<div class='wordtype'.*?<\/div>/g, '')
        .replace(/<span class='grammar_info'>(.+?)<\/span>/g, '')
        .replace(/&#039;/g, "'");

      var title = item
        .match(/<div class='main_item'.+?>(.+?)<\/div>/)[1]
        .replace(/(<([^>]+)>)/g, '');

      var trans = item.match(
        /<div class='translation_item'(.|\n|\r| )*?<\/div>/g
      );

      var sub = [];
      trans.forEach(function (item) {
        var tran = item
          .match(/<div class='translation_item'.*?>((.|\n|\r| )*?)<\/div>/)[1]
          .trim();
        sub.push(tran);
      });

      sub = sub.join(', ').replace(/(<([^>]+)>)/g, '');

      var lang = item.match(/lc='(.*?)'/)[1];
      var url = 'https://www.linguee.com' + item.match(/href='(.*?)'/)[1];

      result.push({
        title: title,
        subtitle: sub,
        action: 'openURL',
        actionArgument: {
          title: title,
          url: url,
          sub: sub,
          lang: lang,
        },
        icon: lang + '_l',
      });
    });
    return result;
  } else {
    var output = showLanguages(language);
    return output;
  }
}

function openURL(dict) {
  if (LaunchBar.options.shiftKey) {
    LaunchBar.paste(dict.title);
  } else {
    var result = [];
    var data = HTTP.get(dict.url).data;

    data = data
      .replace(/&#039;/g, "'")
      .match(
        /<div id='dictionary'>(.|\n|\r)+?<div class='copyrightLineOuter'>/g
      );

    if (data != null) {
      data = data
        .join('\n')
        .match(
          /<div class='lemma( featured)?'(.|\n|\r)+?<!--translation_lines-->/g
        );

      if (data != null) {
        data.forEach(function (item) {
          item = item.replace(
            /<div class='line inflectioninfo'>.+?<\/div>/g,
            ''
          );

          var badge = item.match(
            /<div class='lemma( featured)?'.*?<span class='tag_wordtype'>/g
          );

          if (badge == null) {
            var badge = item.match(/<div class='lemma( featured)?'.*?<\/h2>/g);
          }

          badge = badge[0]
            .replace(/(<([^>]+)>)/g, '')
            .replace(/&mdash;/g, '')
            .trim();

          if (/<span class='notascommon'>/.test(item)) {
            var main = item.match(
              /(<div class='lemma featured'|<div class='lemma')(.|\n|\r)+?<span class='notascommon'>/
            )[0];
            var rare = item.match(
              /<span class='notascommon'>(.|\n|\r)+?<!--translation_lines-->/
            )[0];
          } else {
            var main = item;
          }

          if (main != null) {
            main = main.match(/<span class='tag_trans'(.+?)<\/a>/g);
            // .match(
            //   /<span class='tag_trans'(.+?)<\/a>(?:.+?class='audio' onclick='playSound\(this,"(.+?)")?/g
            // );

            var lang = main[0].match(/lid='(.*?):/)[1];

            main.forEach(function (item) {
              // var sound = 'http://linguee.com/mp3/' + item + '.mp3';

              var title = item
                .replace(/<span class='grammar_info'>(.+?)<\/span>/g, '')
                .replace(/(<([^>]+)>)/g, '');

              result.push({
                title: title,
                badge: badge,
                action: 'options',
                actionArgument: {
                  title: title,
                  url: dict.url,
                },
                icon: lang + '_r',
              });
            });
          }

          if (rare != null) {
            rare = rare.match(/<span class='tag_trans'(.+?)<\/a>/g);

            var lang = rare[0].match(/lid='(.*?):/)[1];

            rare.forEach(function (item) {
              var title = item
                .replace(/<span class='grammar_info'>(.+?)<\/span>/g, '')
                .replace(/(<([^>]+)>)/g, '');

              result.push({
                title: title,
                badge: badge,
                label: 'less common'.localize(),
                action: 'options',
                actionArgument: {
                  title: title,
                  url: dict.url,
                },
                icon: 'iconTemplate',
                icon: lang + '_r',
              });
            });
          }
        });
      } else {
        var response = LaunchBar.alert(
          'No content!'.localize(),
          'Open Website?',
          'Open',
          'Cancel'
        );
        switch (response) {
          case 0:
            LaunchBar.hide();
            LaunchBar.openURL(dict.url);
            break;
          case 1:
            break;
        }
      }

      return result;
    } else {
      var trans = dict.sub.split(', ');
      var result = [];
      trans.forEach(function (item) {
        result.push({
          title: item,
          badge: dict.title,
          icon: 'bubble',
          action: 'options',
          actionArgument: {
            title: item,
            url: dict.url,
          },
        });
      });
      result[0].subtitle =
        'Becaus of an issue only preview results are shown.'.localize();
      return result;
    }
  }
}

function options(dict) {
  if (LaunchBar.options.shiftKey) {
    LaunchBar.paste(dict.title);
  } else {
    LaunchBar.openURL(dict.url);
  }
}

function showLanguages(language) {
  var result = [];

  result.push(
    {
      title: 'English ↔ German'.localize(),
      icon: 'enDe',
      action: 'setLanguage',
      actionArgument: 'english-german',
    },
    {
      title: 'French ↔ German'.localize(),
      icon: 'frDe',
      action: 'setLanguage',
      actionArgument: 'french-german',
    },
    {
      title: 'French ↔ English'.localize(),
      icon: 'frEn',
      action: 'setLanguage',
      actionArgument: 'french-english',
    },
    {
      title: 'Spanish ↔ German'.localize(),
      icon: 'esDe',
      action: 'setLanguage',
      actionArgument: 'spanish-german',
    },
    {
      title: 'Spanish ↔ English'.localize(),
      icon: 'esEn',
      action: 'setLanguage',
      actionArgument: 'spanish-english',
    },
    {
      title: 'Portuguese ↔ German'.localize(),
      icon: 'ptDe',
      action: 'setLanguage',
      actionArgument: 'german-portuguese',
    },
    {
      title: 'Portuguese ↔ English'.localize(),
      icon: 'ptEn',
      action: 'setLanguage',
      actionArgument: 'english-portuguese',
    },
    {
      title: 'Russian ↔ English'.localize(),
      icon: 'ruEn',
      action: 'setLanguage',
      actionArgument: 'english-russian',
    }
  );

  result.forEach(function (item) {
    if (item.actionArgument == language) {
      item.label = '✔︎';
    }
  });
  return result;
}

function setLanguage(language) {
  Action.preferences.language = language;

  var output = showLanguages(language);
  return output;
}
