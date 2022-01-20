/* Accordance Display Text by Ptujec 2021-07-22

Sources and hints:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- http://macbiblioblog.blogspot.com/2009/01/downloads.html
- https://stackoverflow.com/questions/17895039/how-to-insert-line-break-after-every-80-characters/17895095
- http://jsfiddle.net/jahroy/Rwr7q/18/
*/

const GermanBookList = [
  'Mose',
  'Genesis',
  'Exodus',
  'Levitikus',
  'Numeri',
  'Deuternomium',
  'Josua',
  'Richter',
  'Rut',
  'Könige',
  'Chronik',
  'Esra',
  'Nehemia',
  'Ester',
  'Hiob',
  'Psalmen',
  'Sprichwörter',
  'Sprüche',
  'Kohelet',
  'Prediger',
  'Hohelied',
  'Jesaja',
  'Jeremia',
  'Klagelieder',
  'Hesekiel',
  'Hosea',
  'Obadja',
  'Jona',
  'Micha',
  'Habakuk',
  'Zefanja',
  'Haggai',
  'Sacharja',
  'Maleachi',
  'Matthäus',
  'Markus',
  'Lukas',
  'Johannes',
  'Apg',
  'Apostelgeschichte',
  'Römer',
  'Korinther',
  'Galater',
  'Epheser',
  'Philipper',
  'Kolosser',
  'Thessalonicher',
  'Timotheus',
  'Philemon',
  'Hebräer',
  'Jakobus',
  'Petrus',
  'Judas',
  'Offenbarung',
];

const SloveneBookList = [
  'Mojzes',
  'Geneza',
  'Eksodus',
  'Levitik',
  'Numeri',
  'Devteronomij',
  'Jozue',
  'Sodniki',
  'Ruta',
  'Kralji',
  'Kroniška',
  'Ezra',
  'Nehemija',
  'Estera',
  'Job',
  'Psalmi',
  'Pregovori',
  'Pregovori',
  'Kohelet',
  'Pridigar',
  'Visoka pesem',
  'Izaija',
  'Jeremija',
  'Žalostinke',
  'Ezekiel',
  'Ozej',
  'Abdija',
  'Jona',
  'Mihej',
  'Habakuk',
  'Sofonija',
  'Agej',
  'Zaharija',
  'Malahija',
  'Matej',
  'Marko',
  'Luka',
  'Janez',
  'Apd',
  'Apostolska dela',
  'Rimljanom',
  'Korinčanom',
  'Galačanom',
  'Efežanom',
  'Filipljanom',
  'Kološanom',
  'Tesaloničanom',
  'Timoteju',
  'Filemonu',
  'Hebrejcem',
  'Jakob',
  'Peter',
  'Juda',
  'Razodetje',
];

const EnglishBookList = [
  'Moses',
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  'Kings',
  'Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalms',
  'Proverbs',
  'Proverbs',
  'Ecclesiastes',
  'Ecclesiastes',
  'Song',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Hosea',
  'Obadiah',
  'Jonah',
  'Micah',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Acts',
  'Romans',
  'Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  'Thessalonians',
  'Timothy',
  'Philemon',
  'Hebrews',
  'James',
  'Peter',
  'Jude',
  'Revelation',
];

const AccordancePrefs = eval(
  File.readText('~/Library/Preferences/Accordance Preferences/General.apref')
)[0]; // For default translation & vers notation settings

function run(argument) {
  var translation = Action.preferences.translation;

  if (translation == undefined) {
    var translation =
      AccordancePrefs['com.oaktree.settings.general.defaultsearchtext'];

    Action.preferences.translation = translation;
  }

  if (LaunchBar.options.shiftKey) {
    var output = listTranslations();
    return output;
  } else {
    // Check Vers Notation Setting (see checkbox in "Appearance" section of Accoradance Preferences)
    var num =
      AccordancePrefs['com.oaktree.settings.general.useeuropeanversenotation'];

    if (num == 0) {
      // Default Vers Notation
      var result = argument;
    } else {
      // European Vers Notation
      argument = argument
        .trim()
        // clean up capture (e.g. brackets) and formart errors (e.g. spaces before or after verse numbers) in entry
        .replace(/\(|\)/g, '')
        .replace(/(\s+)?([\-–,:])(\s+)?/g, '$2');

      // Convert Slovene and German argument strings
      var mA = argument.match(
        /(?:[1-5]\.?\s?)?(?:[a-zžščöäü]+\.?\s?)?[0-9,.:\-–f]+/gi
      );

      var result = [];
      for (var i = 0; i < mA.length; i++) {
        var scrip = mA[i].toString().trim();

        // makes sure non-european styles get converted
        if (scrip.includes(':')) {
          scrip = scrip.replace(/,/g, '.').replace(/:/g, ',');
        }

        var mB = scrip.match(
          /([1-5]\.?\s?)?([a-zžščöäü]+\.?\s?)?([0-9,.:\-–f]+)/i
        );

        var prefix = mB[1];

        if (prefix == undefined) {
          prefix = '';
        } else {
          prefix = prefix.replace(/\./, '');
        }

        var bookName = mB[2];

        if (bookName == undefined) {
          bookName = '';
        } else {
          bookName = bookName.trim().replace(/\./, '').toLowerCase();

          var iBN = GermanBookList.findIndex((element) =>
            element.toLowerCase().startsWith(bookName)
          );

          if (iBN == -1) {
            iBN = SloveneBookList.findIndex((element) =>
              element.toLowerCase().startsWith(bookName)
            );
          }

          if (iBN != -1) {
            bookName = EnglishBookList[iBN];
          }
          bookName = bookName + ' ';
        }
        var suffix = mB[3];

        var newScrip = prefix + bookName + suffix;

        result.push(newScrip + ' ');
      }
      result = result
        .toString()
        .replace(/ ,/g, '; ')
        .trim()
        .replace(/1 Moses|1Moses/, 'Genesis')
        .replace(/2 Moses|2Moses/, 'Exodus')
        .replace(/3 Moses|3Moses/, 'Leviticus')
        .replace(/4 Moses|4Moses/, 'Numbers')
        .replace(/5 Moses|5Moses/, 'Deuteronomy');
    }

    if (LaunchBar.options.commandKey) {
      var output = listTranslations(result, argument);
      return output;
    } else {
      displayText(result, argument, translation);
    }
  }
}

function displayText(result, argument, translation) {
  var text = LaunchBar.executeAppleScript(
    'tell application "Accordance" to set theResult to «event AccdTxRf» {"' +
      translation +
      '", "' +
      result +
      '", true}'
  ).trim();

  var tL = text.length;
  var lineLength = tL / 7;

  if (lineLength < 42) {
    lineLength = 42;
  } else if (lineLength > 68) {
    lineLength = 68;
  }

  if (tL > 948) {
    // truncate
    text = text.trim();
    text = text.substring(0, 948) + '…';
    lineLength = 68;
  }

  var arrayOfLines = fold(text, lineLength);
  text = arrayOfLines.join('\n').replace(/\n\s/g, '\n');

  // Uncomment if you are using this a lot in Fullscreen mode
  // LaunchBar.executeAppleScript('tell application "Mission Control" to launch');

  // Cleanup Bible Text Abbreviation for User Bibles and Bibles with Lemmata
  translationName = translation.replace(/°|-LEM/g, '');
  argument = argument.charAt(0).toUpperCase() + argument.slice(1);

  LaunchBar.displayInLargeType({
    title: argument + ' (' + translationName + ')',
    string: text,
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

function listTranslations(result, argument) {
  var translations = File.getDirectoryContents(
    '~/Library/Application Support/Accordance/Modules/Texts'
  );

  var defaultTranslation = [];
  var lastUsedTranslation = [];
  var rest = [];
  for (var i = 0; i < translations.length; i++) {
    var translation = translations[i].split('.')[0];

    if (translations[i].split('.')[1] == 'atext') {
      var plistPath =
        '~/Library/Application Support/Accordance/Modules/Texts/' +
        translation +
        '.atext/Info.plist';

      if (!File.exists(plistPath)) {
        plistPath =
          '~/Library/Application Support/Accordance/Modules/Texts/' +
          translation +
          '.atext/ExtraInfo.plist';
      }

      var plist = File.readPlist(plistPath);
      var translationName = plist['com.oaktree.module.humanreadablename'];

      if (translationName == undefined) {
        var translationName = translation.trim();
      }
    } else {
      var translationName = translation.trim();
    }

    if (LaunchBar.options.commandKey) {
      var pushContent = {
        title: translationName,
        subtitle: argument,
        action: 'setTranslation',
        actionArgument: {
          result: result,
          argument: argument,
          translation: translation,
        },
      };
    } else {
      var pushContent = {
        title: translationName,
        action: 'setDefaultTranslation',
        actionArgument: translation,
      };
    }

    if (
      translation === Action.preferences.lastUsed &&
      LaunchBar.options.commandKey
    ) {
      pushContent.icon = 'bookTemplate';
      lastUsedTranslation.push(pushContent);
    } else if (translation === Action.preferences.translation) {
      pushContent.icon = 'selectedBookTemplate';
      defaultTranslation.push(pushContent);
    } else {
      pushContent.icon = 'bookTemplate';
      rest.push(pushContent);
    }
  }
  rest.sort(function (a, b) {
    return a.title > b.title;
  });

  var result = lastUsedTranslation.concat(defaultTranslation.concat(rest));
  return result;
}

function setDefaultTranslation(translation) {
  Action.preferences.translation = translation;
  var output = listTranslations();
  return output;
}

function setTranslation(aA) {
  result = aA.result;
  argument = aA.argument;
  translation = aA.translation;

  Action.preferences.lastUsed = translation;

  displayText(result, argument, translation);
}
