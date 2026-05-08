/*
Accordance Display Text Action for LaunchBar
by Christian Bender (@ptujec)
2023-06-29

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

The Original Accordance Automation Script Library:
- http://macbiblioblog.blogspot.com/2009/01/downloads.html
*/

String.prototype.localizationTable = 'default';

const AccordancePrefs = eval(
  File.readText('~/Library/Preferences/Accordance Preferences/General.apref'),
)[0]; // For default translation & vers notation settings

const accordanceDefaultSearchText =
  AccordancePrefs['com.oaktree.settings.general.defaultsearchtext'];

const bookNameDictionary = File.readJSON(
  Action.path + '/Contents/Resources/booknames.json',
); // Currently contains German and Slovene names. You could expand it with your language by adding the relevant names to the "alt" array.

const textModulesPath =
  '~/Library/Application Support/Accordance/Modules/Texts/';

function run(argument) {
  const translation =
    Action.preferences.translation || accordanceDefaultSearchText;

  if (LaunchBar.options.shiftKey) return settings();

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
      (match, p1) => (p1 != 'f' && p1 != 'ff' ? replaceBookName(p1) : p1),
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
    return listTranslations({ newArgument, argument, mode: 'lookup' });
  } else {
    return getText(newArgument, argument, translation);
  }
}

function getText(newArgument, argument, translation, isFallback = false) {
  let text = LaunchBar.executeAppleScript(
    `tell application "Accordance" to set theResult to «event AccdTxRf» {"${translation}", "${newArgument}", true}`,
  ).trim();

  if (text.startsWith('ERR')) {
    trackFailedTranslation(newArgument, translation);

    const fallbackTranslation =
      Action.preferences.fallbackTranslation || accordanceDefaultSearchText;

    if (fallbackTranslation && translation !== fallbackTranslation) {
      // LaunchBar.displayNotification({
      //   title: 'Accordance Display action',
      //   string: `The text is not available in "${translation}". Falling back to "${fallbackTranslation}"`,
      // });

      return getText(newArgument, argument, fallbackTranslation, true);
    }

    // If fallback translation also failed, exclude it and clear the preference
    if (isFallback) {
      trackFailedFallbackTranslation(translation);
      Action.preferences.fallbackTranslation = undefined;
    }

    if (accordanceDefaultSearchText) {
      return getText(newArgument, argument, accordanceDefaultSearchText, true);
    }

    const response = LaunchBar.alert(
      'Error!',
      text +
        `\nTry picking a different translation than "${translation}" or check your query.`,
      'Ok',
      'Cancel'.localize(),
    );

    switch (response) {
      case 0:
        return listTranslations({ newArgument, argument, mode: 'lookup' });
      case 1:
        return;
    }
  }

  // Clear failed translations on success
  clearFailedTranslations(newArgument);

  // Cleanup quote (Ony works if you have checked "Split discontiguous verses" in Citation settings)
  text = text.replace(/(\s+)?\r\r(\s+)?/g, ' […] ');

  // Cleanup Bible Text Abbreviation for User Bibles and Bibles with Lemmata
  const translationName = translation.replace(/°|-LEM/g, '');
  // Uppercase first character of query
  argument = argument.charAt(0).toUpperCase() + argument.slice(1);

  let reference = `${argument} ${translationName}`;

  if (isFallback) reference += ' (fallback)';

  display(text, reference);
}

function display(text, reference) {
  LaunchBar.displayInLargeType({
    title: reference,
    string: text,
  });
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
  const fallbackTranslation =
    Action.preferences.fallbackTranslation?.replace(/°|-LEM/g, '') ||
    accordanceDefaultSearchText;

  return [
    {
      title: 'Choose default translation'.localize(),
      icon: 'bookTemplate',
      label: Action.preferences.translation.replace(/°|-LEM/g, ''),
      children: listTranslations({ mode: 'default' }),
    },
    {
      title: 'Choose fallback translation'.localize(),
      icon: 'bookTemplate',
      label: fallbackTranslation,
      action: 'listTranslations',
      actionArgument: { mode: 'fallback' },
      actionReturnsItems: true,
    },
  ];
}

function listTranslations({ newArgument, argument, mode = 'lookup' } = {}) {
  const translations = File.getDirectoryContents(textModulesPath);
  const failedTranslations =
    mode === 'lookup' ? getFailedTranslations(newArgument) : [];
  const failedFallbackTranslations =
    mode === 'fallback' ? getFailedFallbackTranslations() : [];

  return translations
    .map((translationFile) => {
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

      const isLastUsed = translation === Action.preferences.lastUsed;
      const isDefault =
        translation ===
        (Action.preferences.translation || accordanceDefaultSearchText);
      const isFallback =
        translation ===
        (Action.preferences.fallbackTranslation || accordanceDefaultSearchText);
      const isFailed = failedTranslations.includes(translation);
      const isFailedFallback = failedFallbackTranslations.includes(translation);

      if (isFailed && mode === 'lookup') return null;
      if (
        isFailedFallback &&
        mode === 'fallback' &&
        !LaunchBar.options.commandKey
      )
        return null;

      const item = {
        title: translationName,
        ...(mode === 'lookup' &&
          // argument && { subtitle: argument, alwaysShowsSubtitle: true }),
          argument && { subtitle: argument }),
        action:
          mode === 'default'
            ? 'setDefaultTranslation'
            : mode === 'fallback'
              ? 'setFallbackTranslation'
              : 'setTranslation',
        actionArgument: {
          newArgument: newArgument,
          argument: argument,
          translation: translation,
        },
        icon:
          (mode === 'default' && isDefault) ||
          (mode === 'fallback' && isFallback)
            ? 'selectedBookTemplate'
            : 'bookTemplate',
        ...(mode === 'lookup' && isLastUsed && { badge: 'recent'.localize() }),
        priority:
          mode === 'lookup'
            ? isLastUsed
              ? 0
              : 2
            : (mode === 'default' && isDefault) ||
                (mode === 'fallback' && isFallback)
              ? 1
              : 2,
      };

      return item;
    })
    .filter((item) => item !== null)
    .sort((a, b) =>
      a.priority !== b.priority
        ? a.priority - b.priority
        : a.title.localeCompare(b.title),
    )
    .map(({ priority, ...item }) => item);
}

function setDefaultTranslation({ translation }) {
  Action.preferences.translation = translation;
  return settings();
}

function setFallbackTranslation({ translation }) {
  Action.preferences.fallbackTranslation = translation;
  Action.preferences.failedFallbackTranslations = (
    Action.preferences.failedFallbackTranslations || []
  ).filter((t) => t !== translation);
  return listTranslations({ mode: 'fallback' });
}

function setTranslation({ newArgument, argument, translation }) {
  Action.preferences.lastUsed = translation;
  return getText(newArgument, argument, translation);
}

function trackFailedTranslation(newArgument, translation) {
  const key = `failedTranslations_${newArgument}`;
  const failed = Action.preferences[key] || [];
  if (!failed.includes(translation)) {
    Action.preferences[key] = [...failed, translation];
  }
}

function getFailedTranslations(newArgument) {
  return Action.preferences[`failedTranslations_${newArgument}`] || [];
}

function clearFailedTranslations(newArgument) {
  delete Action.preferences[`failedTranslations_${newArgument}`];
}

function trackFailedFallbackTranslation(translation) {
  const failed = Action.preferences.failedFallbackTranslations || [];
  if (!failed.includes(translation)) {
    Action.preferences.failedFallbackTranslations = [...failed, translation];
  }
}

function getFailedFallbackTranslations() {
  return Action.preferences.failedFallbackTranslations || [];
}

function clearFailedFallbackTranslations() {
  delete Action.preferences.failedFallbackTranslations;
}
