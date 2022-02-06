// LaunchBar Action for Sloleks, slovenski oblikoslovni leksikon

function run(argument) {
  if (argument != undefined) {
    argument = argument.trim();
    if (argument != '') {
      var result = HTTP.getJSON(
        'https://viri.cjvt.si/sloleks/ajax_api/v1/slv/search_prefix/' +
          encodeURIComponent(argument),
        3
      ).data;

      if (result != undefined) {
        var suggestions = [];
        for (var i = 0; i < result.length; i++) {
          var lemma = result[i].lemma;
          var category = result[i].category;
          var id = result[i].id;
          var mainURL =
            'https://viri.cjvt.si/sloleks/slv/headword/' +
            id +
            '?tab=-_oblike#search';
          var dataURL =
            'https://viri.cjvt.si/sloleks/slv/headword/' +
            id +
            '?output=download';

          var gender = result[i].gender;

          if (gender != undefined) {
            var badge = category + ', ' + gender;
          } else {
            var badge = category;
          }

          var pushData = {
            title: lemma,
            badge: badge,
            icon: 'lTemplate',
            action: 'getAttributes',
            actionArgument: {
              category: category,
              lemma: lemma,
              mainURL: mainURL,
              dataURL: dataURL,
            },
          };

          var description = result[i].description
            .trim()
            .replace(/^\(|\)$/g, '');

          if (description != undefined) {
            pushData.subtitle = description;
          }

          suggestions.push(pushData);
        }
      }
      return suggestions;
    }
  } else {
    // No argument passed, just open the website:
    LaunchBar.hide();
    LaunchBar.openURL('https://viri.cjvt.si/sloleks/slv/');
  }
}

function getAttributes(dict) {
  var category = dict.category;
  var lemma = dict.lemma;
  var mainURL = dict.mainURL;
  var dataURL = dict.dataURL;

  if (LaunchBar.options.alternateKey) {
    LaunchBar.hide();
    LaunchBar.openURL(mainURL);
  } else {
    var data = HTTP.loadRequest(dataURL, {
      timeout: 5.0,
      method: 'GET',
      resultType: 'text',
    }).data.split('\n');

    if (category == 'noun') {
      var nom = [];
      var gen = [];
      var dat = [];
      var acc = [];
      var loc = [];
      var inst = [];
      for (var i = 9; i < data.length - 1; i++) {
        var columns = data[i].split('\t');
        var gForm = columns[0]; // grammatical form
        var gGender = columns[3]; // gender
        var gComparative = columns[5]; // g. positive (e.g. osnovnik)
        var gCase = columns[6]; // g. case

        if (gCase == 'im.') {
          nom.push(gForm);
        } else if (gCase == 'rod.') {
          gen.push(gForm);
        } else if (gCase == 'daj.') {
          dat.push(gForm);
        } else if (gCase == 'tož.') {
          acc.push(gForm);
        } else if (gCase == 'mest.') {
          loc.push(gForm);
        } else if (gCase == 'or.') {
          inst.push(gForm);
        }
      }

      var actionArgument = {
        title: lemma.trim(),
        url: mainURL,
      };

      return [
        {
          title: nom.join(', '),
          badge: 'imenovalnik',
          icon: 'oneTemplate',
          action: 'openURL',
          actionArgument: actionArgument,
        },
        {
          title: gen.join(', '),
          badge: 'rodilnik',
          icon: 'twoTemplate',
          action: 'openURL',
          actionArgument: actionArgument,
        },
        {
          title: dat.join(', '),
          badge: 'dajalnik',
          icon: 'threeTemplate',
          action: 'openURL',
          actionArgument: actionArgument,
        },
        {
          title: acc.join(', '),
          badge: 'tožilnik',
          icon: 'fourTemplate',
          action: 'openURL',
          actionArgument: actionArgument,
        },
        {
          title: loc.join(', '),
          badge: 'mestnik',
          icon: 'fiveTemplate',
          action: 'openURL',
          actionArgument: actionArgument,
        },
        {
          title: inst.join(', '),
          badge: 'orodnik',
          icon: 'sixTemplate',
          action: 'openURL',
          actionArgument: actionArgument,
        },
      ];
    } else if (category == 'adjective') {
      var ad = [];
      var comp = [];
      var sup = [];
      for (var i = 9; i < data.length - 1; i++) {
        var columns = data[i].split('\t');
        var gForm = columns[0]; // grammatical form
        var gGender = columns[3]; // gender
        var gNumber = columns[4]; // g. number
        var gComparative = columns[5]; // (e.g. osnovnik)
        var gCase = columns[6]; // g. case

        if (gGender == 'moški' && gCase == 'im.' && gNumber == 'ednina') {
          if (gComparative == 'osnovnik') {
            ad.push(gForm);
          } else if (gComparative == 'primernik') {
            comp.push(gForm);
          } else if (gComparative == 'presežnik') {
            sup.push(gForm);
          } else if (gComparative == ' ') {
          }
        }
      }

      var actionArgument = {
        title: lemma.trim(),
        url: mainURL,
      };

      if (comp != '') {
        return [
          {
            title: ad.join(', '),
            badge: 'osnovnik',
            icon: 'stepOneTemplate',
            action: 'openURL',
            actionArgument: actionArgument,
          },
          {
            title: comp.join(', '),
            badge: 'primernik',
            icon: 'stepTwoTemplate',
            action: 'openURL',
            actionArgument: actionArgument,
          },
          {
            title: sup.join(', '),
            badge: 'presežnik',
            icon: 'stepThreeTemplate',
            action: 'openURL',
            actionArgument: actionArgument,
          },
        ];
      }
    } else if (category == 'adverb') {
      var ad = [];
      var comp = [];
      var sup = [];
      for (var i = 9; i < data.length - 1; i++) {
        var columns = data[i].split('\t');
        var gForm = columns[0]; // grammatical form
        var gComparative = columns[6]; // (e.g. osnovnik)

        if (gComparative == 'osnovnik') {
          ad.push(gForm);
        } else if (gComparative == 'primernik') {
          comp.push(gForm);
        } else if (gComparative == 'presežnik') {
          sup.push(gForm);
        }
      }

      var actionArgument = {
        title: lemma.trim(),
        url: mainURL,
      };

      if (comp != '') {
        return [
          {
            title: ad.join(', '),
            badge: 'osnovnik',
            icon: 'stepOneTemplate',
            action: 'openURL',
            actionArgument: actionArgument,
          },
          {
            title: comp.join(', '),
            badge: 'primernik',
            icon: 'stepTwoTemplate',
            action: 'openURL',
            actionArgument: actionArgument,
          },
          {
            title: sup.join(', '),
            badge: 'presežnik',
            icon: 'stepThreeTemplate',
            action: 'openURL',
            actionArgument: actionArgument,
          },
        ];
      }
    } else if (category == 'verb') {
      var presentFirstPerson = [];
      var participleMale = [];
      var imperative = [];

      for (var i = 9; i < data.length - 1; i++) {
        var columns = data[i].split('\t');
        var gForm = columns[0]; // grammatical form
        var gTense = columns[4]; // category 1
        var cat2 = columns[5]; // gender or person
        var cat3 = columns[6]; //

        if (gTense == 'sedanjik') {
          if (cat3 == 'prva') {
            presentFirstPerson.push(gForm);
          }
        } else if (gTense == 'deležnik') {
          if (cat2 == 'moški') {
            participleMale.push(gForm);
          }
        } else if (gTense == 'velelnik') {
          if (cat3 == 'ednina' && cat2 == 'druga') {
            imperative.push(gForm);
          }
        }
      }
      var actionArgument = {
        title: lemma.trim(),
        url: mainURL,
      };

      var result = [
        {
          title: presentFirstPerson.join(', '),
          badge: lemma + ', sedanjik, 1.',
          icon: 'presentTemplate',
          action: 'openURL',
          actionArgument: actionArgument,
        },
        {
          title: participleMale.join(', '),
          badge: lemma + ', deležnik, m.',
          icon: 'participleTemplate',
          action: 'openURL',
          actionArgument: actionArgument,
        },
        {
          title: imperative.join(', '),
          badge: lemma + ', velelnik, 2.',
          icon: 'imperativeTemplate',
          action: 'openURL',
          actionArgument: actionArgument,
        },
      ];
      return result;
    }
  }
}

function openURL(dict) {
  if (LaunchBar.options.shiftKey) {
    LaunchBar.paste(dict.title);
  } else {
    LaunchBar.hide();
    LaunchBar.openURL(encodeURI(dict.url));
  }
}
