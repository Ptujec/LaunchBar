/* 
Accordance Look Up Action for LaunchBar
by Christian Bender (@ptujec)
2023-06-29

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://accordancefiles2.com/helpfiles/14-macOS/index.htm#t=mac_14%2Fcontent%2Ftopics%2F05_dd%2Fusing_links_common_tasks.htm&rhsearch=url&rhhlterm=url%20urls (See: Examples of Accordance-specific URLs)

The Original Accordance Automation Script Library:
- http://macbiblioblog.blogspot.com/2009/01/downloads.html
*/

const AccordancePrefs = eval(
  File.readText('~/Library/Preferences/Accordance Preferences/General.apref')
)[0]; // For default translation & vers notation settings

const bookNameDictionary = File.readJSON(
  Action.path + '/Contents/Resources/booknames.json'
); // Currently contains German and Slovene names. You could expand it with your language by adding the relevant names to the "alt" array.

const textModulesPath =
  '~/Library/Application Support/Accordance/Modules/Texts/';

function run(argument) {
  argument = argument.trim();

  // Check Vers Notation Setting (see checkbox in "Appearance" section of Accoradance Preferences)
  const num =
    AccordancePrefs['com.oaktree.settings.general.useeuropeanversenotation'];

  let newArgument;

  if (num == 0) {
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

  return lookUpOptions(newArgument, argument);
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

function lookUpOptions(newArgument, argument) {
  // UI language check
  const accPlist = File.readPlist(
    '~/Library/Preferences/com.OakTree.Accordance.plist'
  );
  let lang = accPlist.AppleLanguages;

  if (lang) {
    lang = lang.toString();
  } else {
    const globalPlist = File.readPlist(
      '/Library/Preferences/.GlobalPreferences.plist'
    );
    lang = globalPlist.AppleLanguages.toString();
  }

  let allTextSetting = lang.startsWith('de')
    ? '[Alle_Texte];Verses?'
    : '[All_Texts];Verses?';

  // Choose translation
  if (LaunchBar.options.commandKey) {
    return chooseTranslation(newArgument, argument);
  }

  LaunchBar.hide();

  // Smart options - choosing between read and research based on input
  if (
    newArgument.endsWith('f') ||
    newArgument.includes('-') ||
    newArgument.includes('–') ||
    newArgument.includes(';') ||
    !newArgument.includes(',')
  ) {
    LaunchBar.openURL('accord://read?' + encodeURI(newArgument));
  } else {
    LaunchBar.openURL(
      'accord://research/' + allTextSetting + encodeURI(newArgument)
    );
  }
}

function chooseTranslation(newArgument, argument) {
  const translations = File.getDirectoryContents(textModulesPath);

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
      action: 'lookupInTranslation',
      actionArgument: {
        translation: translation,
        newArgument: newArgument,
      },
      icon: 'bookTemplate',
    };

    const isLastUsed = translation === Action.preferences.lastUsed;

    if (isLastUsed) {
      pushContent.badge = 'recent';
      lastUsedTranslation.push(pushContent);
    } else {
      rest.push(pushContent);
    }
  });

  rest.sort((a, b) => a.title.localeCompare(b.title));

  return lastUsedTranslation.concat(rest);
}

function lookupInTranslation({ translation, newArgument }) {
  Action.preferences.lastUsed = translation;

  LaunchBar.hide();
  LaunchBar.openURL(
    'accord://read/' + encodeURI(translation) + '?' + encodeURI(newArgument)
  );
}
