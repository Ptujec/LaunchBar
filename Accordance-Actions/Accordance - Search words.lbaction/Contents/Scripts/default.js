/* 2021-07-25 @Ptujec 

- http://www.accordancebible.com/Accordance-1043-Is-Automagical/
- http://accordancefiles2.com/helpfiles/OSX12/Default.htm#topics/05_dd/using_links_common_tasks.htm#kanchor184 (See: Examples of Accordance-specific URLs)
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-file
*/

function run(argument) {
  // Mode (search or research)
  if (argument.includes('#') || LaunchBar.options.commandKey) {
    if (LaunchBar.options.commandKey) {
      // Choose Translation
      var output = chooseTranslation(argument);
      return output;
    } else {
      LaunchBar.openURL('accord://search/?' + encodeURI(argument));
    }
  } else {
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
      var allSetting = '[Alle]';
    } else {
      var allSetting = '[All]';
    }

    var query = argument;
    query = searchOptions(query);

    // Fix for Slovene Unicode Characters (German Umlaute seem to be ok)
    const substrings = ['č', 'ž', 'š', 'Č', 'Ž', 'Š'];
    if (substrings.some((v) => query.includes(v))) {
      LaunchBar.openURL(
        'accord://research/' + allSetting + ';Unicode?' + encodeURI(query)
      );
    } else {
      LaunchBar.openURL(
        'accord://research/' + allSetting + ';?' + encodeURI(query)
      );
    }
  }
}

function searchOptions(query) {
  // Search options:
  // A = <AND>, O = <OR>, N = <NOT>
  query = query
    .trim()
    .replace(/(:)\s+/, '$1')
    .replace(/\s+(#)/, '$1')
    .replace(/\sO\s/g, '<OR>')
    .replace(/\sA\s/g, '<AND>')
    .replace(/\sN\s/g, '<NOT>');

  // Replace spaces with <AND> except if the query is in quotation marks
  if (!query.includes('"')) {
    query = query.replace(/\s/g, '<AND>');
  }
  return query;
}

function chooseTranslation(argument) {
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
      action: 'searchInTranslation',
      actionArgument: {
        translation: translation,
        argument: argument,
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

    if (translation === Action.preferences.lastUsed) {
      lastUsedTranslation.push(pushContent);
    } else {
      otherTranslations.push(pushContent);
    }
  }
  otherTranslations.sort(function (a, b) {
    return b.usage - a.usage || a.title.localeCompare(b.title);
  });

  var translationResult = lastUsedTranslation.concat(otherTranslations);
  return translationResult;
}

function searchInTranslation(dict) {
  var translation = dict.translation;
  var argument = dict.argument;

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
  LaunchBar.hide();
  LaunchBar.openURL(
    'accord://search/' + encodeURI(translation) + '?' + encodeURI(argument)
  );
}
