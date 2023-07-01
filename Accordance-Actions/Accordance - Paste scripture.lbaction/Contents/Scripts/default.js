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

const AccordancePrefs = eval(
  File.readText('~/Library/Preferences/Accordance Preferences/General.apref')
)[0]; // For default translation & vers notation settings

const bookNameDictionary = File.readJSON(
  Action.path + '/Contents/Resources/booknames.json'
); // Currently contains German and Slovene names. You could expand it with your language by adding the relevant names to the "alt" array.

const textModulesPath =
  '~/Library/Application Support/Accordance/Modules/Texts/';

function run(argument) {
  const translation =
    Action.preferences.translation ||
    AccordancePrefs['com.oaktree.settings.general.defaultsearchtext'];

  if (LaunchBar.options.shiftKey) {
    return settings();
  }

  // Check Vers Notation Setting (see checkbox in "Appearance" section of Accoradance Preferences)
  const num =
    AccordancePrefs['com.oaktree.settings.general.useeuropeanversenotation'];

  let newArgument;

  if (num === 0) {
    // Default Vers Notation
    newArgument = argument;
  } else {
    // European Vers Notation
    argument = argument
      // argument clean up
      .trim()
      .replace(/\(|\)/g, '') // remove brackets
      .replace(/\s+/g, ' '); // remove multiple spaces

    // makes sure non-european styles get converted
    if (argument.includes(':')) {
      argument = argument.replace(/,/g, '.').replace(/:/g, ',');
    }

    // convert book names
    newArgument = argument.replace(
      /([a-zžščöäüß]+(?: [a-zžščöäüß]+)?)/gi,
      (match, p1) => (p1 != 'f' && p1 != 'ff' ? replaceBookName(p1) : p1)
    );

    // more clean up for accordance and special treatment for the pentateuch
    newArgument = newArgument
      .replace(/\.( ?[a-zžščöäüß])/gi, '$1')
      .replace(/([a-zžščöäüß])\./gi, '$1')
      .replace(/1 ?Moses/, 'Genesis')
      .replace(/2 ?Moses/, 'Exodus')
      .replace(/3 ?Moses/, 'Leviticus')
      .replace(/4 ?Moses/, 'Numbers')
      .replace(/5 ?Moses/, 'Deuteronomy');
  }

  if (LaunchBar.options.commandKey) {
    return listTranslations(newArgument, argument);
  } else {
    pasteText(newArgument, argument, translation);
  }
}

function pasteText(newArgument, argument, translation) {
  var text = LaunchBar.executeAppleScript(
    'tell application "Accordance" to set theResult to «event AccdTxRf» {"' +
      translation +
      '", "' +
      newArgument +
      '", true}'
  ).trim();

  if (text.startsWith('ERR')) {
    LaunchBar.alert('Error!', text);
    // var output = listTranslations(newArgument, argument);
    // return output;
    return;
    // TODO: Pick a different translation
  }

  // Cleanup quote (Ony works if you have checked "Split discontiguous verses" in Citation settings)
  text = text.replace(/(\s+)?\r\r(\s+)?/g, ' […] ');

  // Cleanup Bible Text Abbreviation for User Bibles and Bibles with Lemmata
  const translationName = translation.replace(/°|-LEM/g, '');
  // Uppercase first character of query
  argument = argument.charAt(0).toUpperCase() + argument.slice(1);

  let format = Action.preferences.format;
  let defaultText = text + ' (' + argument + ' ' + translationName + ')';

  if (format == 'markdown') {
    LaunchBar.paste('> ' + defaultText);
  } else if (format == 'citation') {
    LaunchBar.paste('„' + text + '“ ' + argument + ' ' + translationName);
  } else {
    LaunchBar.paste(defaultText);
  }
}

function replaceBookName(bookName) {
  // Replace alternative booknames and abbreviations with the english name (so Accordance can parse it correctly)
  bookName = bookName.trim().toLowerCase();

  const foundBook = bookNameDictionary.booknames.find((book) => {
    const englishName = book.english.toLowerCase();
    const altNames = book.alt.map((name) => name.toLowerCase());
    const abbrs = book.abbr.map((abbr) => abbr.toLowerCase());

    return (
      englishName.startsWith(bookName) ||
      altNames.some((altName) => altName.startsWith(bookName)) ||
      abbrs.some((abbr) => abbr == bookName)
    );
  });

  if (foundBook) bookName = foundBook.english;

  return bookName;
}

function settings() {
  const formatIcon =
    Action.preferences.format == undefined ||
    Action.preferences.format == 'plain'
      ? 'plainTemplate'
      : Action.preferences.format == 'citation'
      ? 'citationTemplate'
      : 'markdownTemplate';

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
  return settings();
}

function listTranslations(newArgument, argument) {
  const isCommandKeyPressed = LaunchBar.options.commandKey;
  const translations = File.getDirectoryContents(textModulesPath);

  let defaultTranslation = [];
  let lastUsedTranslation = [];
  let rest = [];

  translations.map((translationFile) => {
    const translation = translationFile.split('.')[0];
    const extension = translationFile.split('.')[1];

    let translationName;
    if (extension == 'atext') {
      let plistPath = `${textModulesPath}${translation}.atext/Info.plist`;
      if (!File.exists(plistPath)) {
        plistPath = `${textModulesPath}${translation}.atext/ExtraInfo.plist`;
      }

      const plist = File.readPlist(plistPath);
      translationName =
        plist['com.oaktree.module.humanreadablename'] ||
        plist['com.oaktree.module.fullmodulename'] ||
        translation.trim().replace('°', '');
    } else {
      translationName = translation.trim().replace('°', '');
    }

    const pushContent = {
      title: translationName,
      subtitle: argument,
      alwaysShowsSubtitle: true,
      action: isCommandKeyPressed ? 'setTranslation' : 'setDefaultTranslation',
      actionArgument: {
        newArgument: newArgument,
        argument: argument,
        translation: translation,
      },
      icon: 'bookTemplate',
    };

    const isLastUsed = translation === Action.preferences.lastUsed;
    const isDefault = translation === Action.preferences.translation;

    if (isLastUsed && isCommandKeyPressed) {
      pushContent.icon = 'bookTemplate';
      pushContent.badge = 'recent';
      lastUsedTranslation.push(pushContent);
    } else if (isDefault && !isCommandKeyPressed) {
      pushContent.icon = 'selectedBookTemplate';
      defaultTranslation.push(pushContent);
    } else if (isDefault && isCommandKeyPressed) {
      rest.push(pushContent);
    } else {
      pushContent.icon = 'bookTemplate';
      rest.push(pushContent);
    }
  });

  rest.sort((a, b) => a.title.localeCompare(b.title));

  let result = isCommandKeyPressed
    ? lastUsedTranslation.concat(rest)
    : lastUsedTranslation.concat(defaultTranslation.concat(rest));
  return result;
}

function setDefaultTranslation({ translation }) {
  Action.preferences.translation = translation;
  return listTranslations();
}

function setTranslation({ newArgument, argument, translation }) {
  Action.preferences.lastUsed = translation;
  pasteText(newArgument, argument, translation);
}
