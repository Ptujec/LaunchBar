/* 
Accordance Paste Text Action for LaunchBar
by Christian Bender (@ptujec)
2022-09-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Sources:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- http://macbiblioblog.blogspot.com/2009/01/downloads.html

*/

String.prototype.localizationTable = 'default';

const bookNameDictionary = File.readJSON(
  Action.path + '/Contents/Resources/booknames.json'
); // Currently contains German and Slovene names. You could expand it with your language by adding the relevant names to the "alt" array.

const AccordancePrefs = eval(
  File.readText('~/Library/Preferences/Accordance Preferences/General.apref')
)[0];

function run(argument) {
  var translation = Action.preferences.translation;

  if (translation == undefined) {
    var translation =
      AccordancePrefs['com.oaktree.settings.general.defaultsearchtext'];

    Action.preferences.translation = translation;
  }

  if (LaunchBar.options.shiftKey) {
    var output = settings();
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
        var scrip = mA[i].trim();

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

          // Replace alternative booknames and abbreviations with the english name (so Accordance can parse it correctly)
          var newBookName = '';
          bookNameDictionary.booknames.forEach(function (item) {
            var altNames = item.alt;
            for (var i = 0; i < altNames.length; i++) {
              var name = altNames[i].toLowerCase();
              if (name.startsWith(bookName)) {
                newBookName = item.english;
                break;
              }
            }
          });

          if (newBookName != '') {
            bookName = newBookName + ' ';
          }
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
      pasteText(result, argument, translation);
    }
  }
}

function pasteText(result, argument, translation) {
  var text = LaunchBar.executeAppleScript(
    'tell application "Accordance" to set theResult to «event AccdTxRf» {"' +
      translation +
      '", "' +
      result +
      '", true}'
  ).trim();

  if (text.startsWith('ERR')) {
    LaunchBar.alert('Error!', text);
    // var output = listTranslations(result, argument);
    // return output;
    return;
    // TODO: Pick a different translation
  }

  // Cleanup quote (Ony works if you have checked "Split discontiguous verses" in Citation settings)
  text = text.replace(/(\s+)?\r\r(\s+)?/g, ' […]\n');

  // Cleanup Bible Text Abbreviation for User Bibles and Bibles with Lemmata
  translationName = translation.replace(/°|-LEM/g, '');
  argument = argument.charAt(0).toUpperCase() + argument.slice(1);

  if (Action.preferences.format == 'markdown') {
    LaunchBar.paste(
      '> ' + text + ' (' + argument + ' ' + translationName + ')'
    );
  } else if (Action.preferences.format == 'citation') {
    LaunchBar.paste('„' + text + '“\n\n' + argument + ' ' + translationName);
  } else {
    LaunchBar.paste(text + ' (' + argument + ' ' + translationName + ')');
  }
}

function settings() {
  // TODO: localize
  if (
    Action.preferences.format == undefined ||
    Action.preferences.format == 'plain'
  ) {
    var formatIcon = 'plainTemplate';
  } else if (Action.preferences.format == 'citation') {
    var formatIcon = 'citationTemplate';
  } else {
    var formatIcon = 'markdownTemplate';
  }

  return [
    {
      title: 'Format'.localize(),
      // subtitle: 'Hit return to change!'.localize(),
      icon: formatIcon,
      children: listFormats(),
    },
    {
      title: 'Choose default translation'.localize(),
      icon: 'bookTemplate',
      children: listTranslations(),
    },
  ];
}

function listFormats() {
  return [
    {
      title: 'Paste unformatted'.localize(),
      icon: 'plainTemplate',
      action: 'setFormat',
      actionArgument: 'plain',
    },
    {
      title: 'Paste with quotations'.localize(),
      icon: 'citationTemplate',
      action: 'setFormat',
      actionArgument: 'citation',
    },
    {
      title: 'Paste as markdown quote'.localize(),
      icon: 'markdownTemplate',
      action: 'setFormat',
      actionArgument: 'markdown',
    },
  ];
}

function setFormat(format) {
  Action.preferences.format = format;
  var output = settings();
  return output;
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

  pasteText(result, argument, translation);
}
