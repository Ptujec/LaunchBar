/* Accordance Look Up by Ptujec 2021-07-22

Sources: 
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- http://www.accordancebible.com/Accordance-1043-Is-Automagical/
- http://accordancefiles2.com/helpfiles/OSX12/Default.htm#topics/05_dd/using_links_common_tasks.htm#kanchor184 (See: Examples of Accordance-specific URLs)
- https://stackoverflow.com/a/13012698 (if contains statement)
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
)[0];

function run(argument) {
  argument = argument.trim();

  // Check Vers Notation Setting (see checkbox in "Appearance" section of Accoradance Preferences)
  var num =
    AccordancePrefs['com.oaktree.settings.general.useeuropeanversenotation'];

  if (num == 0) {
    // Default Vers Notation
    var result = argument;
  } else {
    // Add number of first chapternumber if just a bookname is given
    var numCheck = / \d/.test(argument);
    if (numCheck == false) {
      argument = argument + ' 1';
    }

    // European Vers Notation
    argument = argument
      // clean up capture (e.g. brackets) and formart errors (e.g. spaces before or after verse numbers) in entry
      .replace(/\(|\)/g, '')
      .replace(/(\s+)?([\-–,:])(\s+)?/g, '$2');

    // Convert Slovene and German argument strings
    var mA = argument.match(
      /(?:[1-5]\.?\s?)?(?:[a-zžščöäü]+\.?\s?)?[0-9,.:\-–f]+/gi
    );

    if (mA == undefined) {
      var result = argument;
    } else {
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
  var output = lookUp(result, argument);
  return output;
}

function lookUp(result, argument) {
  // UI language check
  var aPlist = File.readPlist(
    '~/Library/Preferences/com.OakTree.Accordance.plist'
  );
  var lang = aPlist.AppleLanguages;

  if (lang != undefined) {
    lang = lang.toString();
  } else {
    var gPlist = File.readPlist(
      '/Library/Preferences/.GlobalPreferences.plist'
    );
    lang = gPlist.AppleLanguages.toString();
  }

  if (lang.startsWith('de')) {
    var allTextSetting = '[Alle_Texte];Verses?';
  } else {
    var allTextSetting = '[All_Texts];Verses?';
  }

  // if (LaunchBar.options.shiftKey) {
  //   // Force read option
  //   LaunchBar.openURL('accord://read/?' + encodeURIComponent(result));
  // } else if (LaunchBar.options.alternateKey) {
  //   // Force research option
  //   LaunchBar.openURL(
  //     'accord://research/' + allTextSetting + encodeURIComponent(result)
  //   );
  // } else {

  // Smart option
  if (
    LaunchBar.options.commandKey ||
    result.endsWith('f') ||
    result.includes('-') ||
    result.includes(';') ||
    !result.includes(',')
  ) {
    if (LaunchBar.options.commandKey) {
      var output = chooseTranslation(result, argument);
      return output;
    } else {
      LaunchBar.openURL('accord://read/?' + encodeURIComponent(result));
    }
  } else {
    LaunchBar.openURL(
      'accord://research/' + allTextSetting + encodeURIComponent(result)
    );
  }
  // }
}

function chooseTranslation(result, argument) {
  var translations = File.getDirectoryContents(
    '~/Library/Application Support/Accordance/Modules/Texts'
  );

  var lastUsedTranslation = [];
  var otherTranslations = [];
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
        var translationName = plist['com.oaktree.module.fullmodulename'];
        if (translationName == undefined) {
          var translationName = translation.trim().replace('°', '');
        }
      }
    } else {
      var translationName = translation.trim().replace('°', '');
    }

    var pushContent = {
      title: translationName,
      subtitle: argument,
      icon: 'bookTemplate',
      action: 'lookupInTranslation',
      actionArgument: {
        translation: translation,
        result: result,
      },

      // url: 'accord://read/' + encodeURI(translation) + '?' + encodeURI(result),
    };

    if (translation === Action.preferences.lastUsed) {
      lastUsedTranslation.push(pushContent);
    } else {
      otherTranslations.push(pushContent);
    }
  }
  otherTranslations.sort(function (a, b) {
    return a.title > b.title;
  });

  var translationResult = lastUsedTranslation.concat(otherTranslations);
  return translationResult;
}

function lookupInTranslation(dict) {
  var translation = dict.translation;
  var result = dict.result;

  Action.preferences.lastUsed = translation;
  LaunchBar.hide();
  LaunchBar.openURL(
    'accord://read/' + encodeURI(translation) + '?' + encodeURI(result)
  );
}
