/*
Accordance Paste Text Action for LaunchBar
by Christian Bender (@ptujec)
2026-05-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Sources:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
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

const fallbackFormat = 'citation';

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
  const fallbackTranslation = Action.preferences.fallbackTranslation; // || accordanceDefaultSearchText;

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

      const reference = `${argument} ${translationName}`;

      paste(text, reference);
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

function paste(text, reference) {
  LaunchBar.hide();

  const frontmostAppID = LaunchBar.execute('/bin/bash', './appInfo.sh').trim();

  if (
    frontmostAppID === 'com.apple.iWork.Keynote' &&
    Action.preferences.keynote
  ) {
    LaunchBar.setClipboardString(text); // Workaround for stupid Unicode stuff
    return pasteInKeynote(text, reference);
  }

  // Get format: first check app-specific format, then fall back to default format
  const appFormats = Action.preferences.appFormats || {};
  let format = appFormats[frontmostAppID] || Action.preferences.format;

  const plainFormatted = `${text} (${reference})`;
  const formats = {
    plain: plainFormatted,
    citation: `“${text}” (${reference})`,
    markdown: `> ${plainFormatted}`,
  };

  const formattedText = formats[format] || formats[fallbackFormat];

  if (frontmostAppID === 'pro.writer.mac' && Action.preferences.iawriter) {
    return pasteInWriter(formattedText);
  }

  // TODO: Add location url to the clipboard (accord://read/ELBER#Rom_4,11) … Accordance Paste Helper Action
  return LaunchBar.paste(formattedText);
}

function pasteInWriter(text) {
  // TODO: Implement in Settings
  // const authorName = Action.preferences.iaAuthor;

  LaunchBar.setClipboardString(text);

  const authorName = 'Accordance';
  const pasteEditsFromMenu =
    'menu 1 of menu item 10 of menu 4 of menu bar 1 of application process "iA Writer"';

  const pasteInWriterAS = `
    delay 0.1
    tell application "iA Writer" to activate
    tell application "System Events"
    click menu item "${authorName}" of ${pasteEditsFromMenu}
    end tell
    `;

  LaunchBar.executeAppleScript(pasteInWriterAS);
}

function pasteInKeynote(text, reference) {
  LaunchBar.executeAppleScript(`
    tell application "Keynote"
      activate
    	set _doc to the front document
      set _slide_num to slide number of current slide of _doc
      tell _doc to duplicate slide _slide_num to after slide _slide_num
    	set _slide to current slide of _doc
     	tell _slide
        set _text_items to get text items
        -- set text values
        set object text of item 1 of _text_items to "${text}"
      	set object text of item 2 of _text_items to "${reference}"
        -- set position of reference 20 below the text
      	delay 0.1

      	set _pos_1 to get position of item 1 of _text_items
      	set _y_1 to item 2 of _pos_1
      	set _height_1 to get height of item 1 of _text_items

      	set _y_2 to _y_1 + _height_1 + 20
      	set _pos_2 to get position of item 2 of _text_items
      	set _x_2 to item 1 of _pos_2
    		set position of item 2 of _text_items to {_x_2, _y_2}
      end tell
    end tell
    `);
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

// SETTINGS

function settings() {
  const formatIcon =
    Action.preferences.format == undefined
      ? `${fallbackFormat}Template`
      : `${Action.preferences.format}Template`;

  const appFormatsCount = Action.preferences.appFormats
    ? String(Object.keys(Action.preferences.appFormats ?? {}).length)
    : undefined;

  const defaultTranslation =
    Action.preferences.translation || accordanceDefaultSearchText;

  return [
    {
      title: 'Choose default translation'.localize(),
      icon: 'bookTemplate',
      badge: defaultTranslation?.replace(/°|-LEM/g, ''),
      children: listTranslations({ mode: 'default' }),
    },
    {
      title: 'Choose fallback translation'.localize(),
      icon: 'bookTemplate',
      badge: Action.preferences.fallbackTranslation?.replace(/°|-LEM/g, ''),
      action: 'listTranslations',
      actionArgument: { mode: 'fallback' },
      actionReturnsItems: true,
    },
    {
      title: 'Format'.localize(),
      icon: formatIcon,
      badge: Action.preferences.format?.localize() ?? fallbackFormat.localize(),
      children: listFormats(),
    },
    {
      title: 'Format by App'.localize(),
      icon: 'appsTemplate',
      badge: appFormatsCount,
      action: 'showAppList',
      actionReturnsItems: true,
    },
    {
      title: 'Use Keynote Paste'.localize(),
      subtitle:
        'Uses first text item as the text, second as the reference.'.localize(),
      alwaysShowsSubtitle: true,
      icon: Action.preferences.keynote ? 'checkTemplate' : 'circleTemplate',
      action: 'toggleKeynotePaste',
    },
    {
      title: 'Use iA Writer Paste'.localize(),
      subtitle:
        'Paste as "Accordance". Set up "Accordance" as an author in iA Writer first.'.localize(),
      alwaysShowsSubtitle: true,
      icon: Action.preferences.iawriter ? 'checkTemplate' : 'circleTemplate',
      action: 'toggleIWriterPaste',
    },
  ];
}

// Translations

function listTranslations({ newArgument, argument, mode = 'lookup' } = {}) {
  const translations = File.getDirectoryContents(textModulesPath);
  const failedTranslations =
    mode === 'lookup' ? getFailedTranslations(newArgument) : [];
  const failedFallbackTranslations =
    mode === 'fallback' ? getFailedFallbackTranslations() : [];
  const defaultPref =
    Action.preferences.translation || accordanceDefaultSearchText;
  const fallbackPref = Action.preferences.fallbackTranslation;

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

// Formatting & Paste Options

function toggleKeynotePaste() {
  Action.preferences.keynote = !Action.preferences.keynote;
  return settings();
}

function toggleIWriterPaste() {
  Action.preferences.iawriter = !Action.preferences.iawriter;
  return settings();
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

function showAppList() {
  const basePath = '/Applications/';
  const dirContents = File.getDirectoryContents(basePath);

  return dirContents
    .map((item) => {
      const fullPath = basePath + item;
      if (item.endsWith('.app') && File.isDirectory(fullPath)) {
        return fullPath;
      }

      if (File.isDirectory(fullPath)) {
        const appItem = File.getDirectoryContents(fullPath).find((sub) =>
          sub.endsWith('.app'),
        );
        return appItem ? `${fullPath}/${appItem}` : undefined;
      }
    })
    .map((path) => {
      const title = File.displayName(path).replace('.app', '');
      const infoPlistPath = `${path}/Contents/Info.plist`;

      if (!File.exists(infoPlistPath)) return;

      const infoPlist = File.readPlist(infoPlistPath);
      const {
        LSUIElement: agentApp,
        CFBundleIdentifier: appID,
        CFBundleDocumentTypes: documentTypes = [],
      } = infoPlist;

      LaunchBar.log(appID, JSON.stringify(documentTypes));
      const canHandleText = documentTypes.some((docType) => {
        const name = docType.CFBundleTypeName?.toLowerCase() || '';
        return (
          name.includes('text') ||
          name.includes('mail') ||
          name.includes('document')
        );
      });

      const appFormat = Action.preferences.appFormats[appID];

      if (!agentApp && appID && canHandleText) {
        return {
          title,
          badge: appFormat?.localize() ?? undefined,
          icon: appID,
          action: 'showFormatOptionsForApp',
          actionArgument: appID,
          actionReturnsItems: true,
        };
      }
    })
    .sort((a, b) => !!b.badge - !!a.badge || a.title.localeCompare(b.title));
}

function showFormatOptionsForApp(appID) {
  const formats = listFormats();
  return [
    ...formats.map((format) => ({
      ...format,
      title: format.title,
      action: 'setFormatForApp',
      actionArgument: { appID, format: format.actionArgument },
    })),
    {
      title: 'Reset to default'.localize(),
      icon: 'resetTemplate',
      action: 'setFormatForApp',
      actionArgument: { appID, format: undefined },
    },
  ];
}

function setFormatForApp({ appID, format }) {
  const appFormats = Action.preferences.appFormats || {};
  appFormats[appID] = format;
  Action.preferences.appFormats = appFormats;
  return showAppList();
}
