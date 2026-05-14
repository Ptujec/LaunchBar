/*
Accordance Display Text Action for LaunchBar
by Christian Bender (@ptujec)
2026-05-08

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
  `${Action.path}/Contents/Resources/booknames.json`,
); // Currently contains German and Slovene names. You could expand it with your language by adding the relevant names to the "alt" array.

const textModulesPath =
  '~/Library/Application Support/Accordance/Modules/Texts/';

function run(argument) {
  if (LaunchBar.options.shiftKey) return settings();

  const translation =
    Action.preferences.translation || accordanceDefaultSearchText;

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

  return LaunchBar.options.commandKey
    ? listTranslations({ newArgument, argument, mode: 'lookup' })
    : getText(newArgument, argument, translation);
}

function getText(newArgument, argument, initialTranslation) {
  const defaultTranslation =
    Action.preferences.translation || accordanceDefaultSearchText;
  const fallbackTranslation =
    Action.preferences.fallbackTranslation || accordanceDefaultSearchText;

  // Build priority list of translations to try (avoid duplicates)
  const translationsToTry = [
    initialTranslation,
    ...(defaultTranslation && defaultTranslation !== initialTranslation
      ? [defaultTranslation]
      : []),
    ...(fallbackTranslation &&
    fallbackTranslation !== initialTranslation &&
    fallbackTranslation !== defaultTranslation
      ? [fallbackTranslation]
      : []),
  ];

  for (const currentTranslation of translationsToTry) {
    let text = LaunchBar.executeAppleScript(
      `tell application "Accordance" to set theResult to «event AccdTxRf» {"${currentTranslation}", "${newArgument}", true}`,
    ).trim();

    if (!text.startsWith('ERR')) {
      clearFailedTranslations(newArgument);
      clearFailedFallbackTranslations();

      // Cleanup quote (NOTE: Only works if you have checked "Split discontiguous verses" in Citation settings in Accordance)
      text = text.replace(/(\s+)?\r\r(\s+)?/g, ' […] ');

      // Cleanup Bible Text Abbreviation for User Bibles and Bibles with Lemmata
      const translationName = currentTranslation.replace(/°|-LEM/g, '');

      // Uppercase first character of query
      argument = argument.charAt(0).toUpperCase() + argument.slice(1);

      const isFallback = currentTranslation === fallbackTranslation;
      const isDefault =
        currentTranslation === defaultTranslation &&
        currentTranslation !== initialTranslation;

      const suffix = isFallback
        ? ' (fallback)'.localize()
        : isDefault
          ? ' (default)'.localize()
          : '';

      const reference = `${argument} ${translationName}${suffix}`;

      display(text, reference);
      return;
    }
    LaunchBar.log(`${currentTranslation} failed: ${text}`);

    // Track failed translation
    trackFailedTranslation(newArgument, currentTranslation);

    // If this was the fallback translation and it failed, mark it
    if (currentTranslation === fallbackTranslation) {
      trackFailedFallbackTranslation(currentTranslation);
    }
  }

  // All predefined translations failed
  return listTranslations({ newArgument, argument, mode: 'lookup' });
}

function display(text, reference) {
  LaunchBar.displayInLargeType({
    title: reference,
    string: text,
  });
}

function replaceBookName(bookName) {
  // Replace alternative booknames and abbreviations with the english name so Accordance can parse it correctly
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
  const defaultTranslation =
    Action.preferences.translation || accordanceDefaultSearchText;

  const fallbackTranslation =
    Action.preferences.fallbackTranslation || accordanceDefaultSearchText;

  return [
    {
      title: 'Choose default translation'.localize(),
      icon: 'bookTemplate',
      badge: defaultTranslation.replace(/°|-LEM/g, ''),
      children: listTranslations({ mode: 'default' }),
    },
    {
      title: 'Choose fallback translation'.localize(),
      icon: 'bookTemplate',
      badge: fallbackTranslation.replace(/°|-LEM/g, ''),
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
  const defaultPref =
    Action.preferences.translation || accordanceDefaultSearchText;
  const fallbackPref =
    Action.preferences.fallbackTranslation || accordanceDefaultSearchText;

  return translations
    .map((translationFile) => {
      const [translation, extension] = translationFile.split('.');
      let translationName = translation.trim().replace('°', '');

      if (extension === 'atext') {
        const plistPath = File.exists(
          `${textModulesPath}${translation}.atext/Info.plist`,
        )
          ? `${textModulesPath}${translation}.atext/Info.plist`
          : `${textModulesPath}${translation}.atext/ExtraInfo.plist`;
        const plist = File.readPlist(plistPath);
        translationName =
          plist['com.oaktree.module.humanreadablename'] ??
          plist['com.oaktree.module.fullmodulename'] ??
          translationName;
      }

      const isLastUsed = translation === Action.preferences.lastUsed;
      const isDefault = translation === defaultPref;
      const isFallback = translation === fallbackPref;
      const isFailed = failedTranslations.includes(translation);
      const isFailedFallback = failedFallbackTranslations.includes(translation);

      if (
        (isFailed && mode === 'lookup') ||
        (isFailedFallback &&
          mode === 'fallback' &&
          !LaunchBar.options.commandKey)
      ) {
        return;
      }

      const isSelected =
        (mode === 'default' && isDefault) ||
        (mode === 'fallback' && isFallback);
      const actionsByMode = {
        default: 'setDefaultTranslation',
        fallback: 'setFallbackTranslation',
        lookup: 'setTranslation',
      };
      const prioritiesByMode = {
        default: isSelected ? 1 : 2,
        fallback: isSelected ? 1 : 2,
        lookup: isLastUsed ? 0 : 2,
      };

      const item = {
        title: translationName,
        ...(mode === 'lookup' && argument && { subtitle: argument }),
        action: actionsByMode[mode],
        actionArgument: { newArgument, argument, translation },
        icon: isSelected ? 'selectedBookTemplate' : 'bookTemplate',
        ...(mode === 'lookup' && isLastUsed && { badge: 'recent'.localize() }),
        priority: prioritiesByMode[mode],
      };

      return item;
    })
    .filter(Boolean)
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
  return settings();
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
