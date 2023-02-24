/* Accordance Display Text by Ptujec 2021-07-22

Sources and hints:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- http://macbiblioblog.blogspot.com/2009/01/downloads.html
- https://stackoverflow.com/questions/17895039/how-to-insert-line-break-after-every-80-characters/17895095
- http://jsfiddle.net/jahroy/Rwr7q/18/
*/

const bookNameDictionary = File.readJSON(
  Action.path + '/Contents/Resources/booknames.json'
); // Currently contains German and Slovene names. You could expand it with your language by adding the relevant names to the "alt" array.

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

      var mA = argument.match(
        /(?:[1-5]\.?\s?)?(?:[a-zžščöäü ]+\.?\s?)?[0-9,.:\-–f]+/gi
      );

      // LaunchBar.alert(JSON.stringify(mA));
      // return;

      var result = [];
      for (var i = 0; i < mA.length; i++) {
        var scrip = mA[i].trim();

        // makes sure non-european styles get converted
        if (scrip.includes(':')) {
          scrip = scrip.replace(/,/g, '.').replace(/:/g, ',');
        }

        var mB = scrip.match(
          /([1-5]\.?\s?)?([a-zžščöäü ]+\.?\s?)?([0-9,.:\-–f]+)/i
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
          bookName = replaceBookName(bookName);
        }
        var suffix = mB[3];

        var newScrip = prefix + bookName + suffix;

        result.push(newScrip + ' ');
      }
      result = result
        .toString()
        .replace(/ ,/g, '; ')
        .trim()
        .replace(/1 ?Moses/, 'Genesis')
        .replace(/2 ?Moses/, 'Exodus')
        .replace(/3 ?Moses/, 'Leviticus')
        .replace(/4 ?Moses/, 'Numbers')
        .replace(/5 ?Moses/, 'Deuteronomy');
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

  // Cleanup quote (Ony works if you have checked "Split discontiguous verses" in Citation settings)
  text = text.replace(/(\s+)?\r\r(\s+)?/g, ' […] ');

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
        var translationName = plist['com.oaktree.module.fullmodulename'];
        if (translationName == undefined) {
          var translationName = translation.trim().replace('°', '');
        }
      }
    } else {
      var translationName = translation.trim().replace('°', '');
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

      var translationUsage = Action.preferences.translationUsage;

      if (translationUsage != undefined) {
        for (var j = 0; j < translationUsage.length; j++) {
          if (translationUsage[j].translation == translation) {
            pushContent.usage = translationUsage[j].usage;
            break;
          } else {
            pushContent.usage = 0;
          }
        }
      }
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
    } else if (
      translation === Action.preferences.translation &&
      !LaunchBar.options.commandKey
    ) {
      pushContent.icon = 'selectedBookTemplate';
      defaultTranslation.push(pushContent);
    } else if (
      translation === Action.preferences.translation &&
      LaunchBar.options.commandKey
    ) {
      pushContent.icon = 'selectedBookTemplate';
      rest.push(pushContent);
    } else {
      pushContent.icon = 'bookTemplate';
      rest.push(pushContent);
    }
  }
  rest.sort(function (a, b) {
    return b.usage - a.usage || a.title.localeCompare(b.title);
  });

  if (LaunchBar.options.commandKey) {
    var result = lastUsedTranslation.concat(rest);
  } else {
    var result = lastUsedTranslation.concat(defaultTranslation.concat(rest));
  }
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

  // Write usage data
  var translationUsage = Action.preferences.translationUsage;

  if (translationUsage == undefined) {
    Action.preferences.translationUsage = [
      {
        translation: translation,
        usage: 1,
      },
    ];
  } else {
    for (var i = 0; i < translationUsage.length; i++) {
      if (translationUsage[i].translation == translation) {
        var usage = translationUsage[i].usage;
        Action.preferences.translationUsage[i].usage = usage + 1;
        var found = true;
      }
    }
    if (found != true) {
      Action.preferences.translationUsage.push({
        translation: translation,
        usage: 1,
      });
    }
  }

  Action.preferences.lastUsed = translation;

  displayText(result, argument, translation);
}

function replaceBookName(bookName) {
  // Replace alternative booknames and abbreviations with the english name (so Accordance can parse it correctly)
  var newBookName = '';
  bookName = bookName.trim().replace(/\./, '').toLowerCase();

  var bookNames = bookNameDictionary.booknames;

  for (var i = 0; i < bookNames.length; i++) {
    var englishName = bookNames[i].english.toLowerCase();
    var altNames = bookNames[i].alt;

    if (englishName.startsWith(bookName)) {
      newBookName = bookNames[i].english;
      break;
    }

    for (var j = 0; j < altNames.length; j++) {
      var altName = altNames[j].toLowerCase();

      if (altName.startsWith(bookName)) {
        newBookName = bookNames[i].english;
        var isBreak = true;
        break;
      }
    }
    var abbrs = bookNames[i].abbr;
    for (var k = 0; k < abbrs.length; k++) {
      var abbr = abbrs[k].toLowerCase();
      if (bookName == abbr) {
        newBookName = bookNames[i].english;
        var isBreak = true;
        break;
      }
    }

    if (isBreak == true) {
      break;
    }
  }

  if (newBookName != '') {
    bookName = newBookName + ' ';
  }
  return bookName;
}
