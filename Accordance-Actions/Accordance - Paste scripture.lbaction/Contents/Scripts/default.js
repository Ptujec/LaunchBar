/*
Accordance Paste Text Action for LaunchBar
by Christian Bender (@ptujec)
2022-09-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Sources:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- http://macbiblioblog.blogspot.com/2009/01/downloads.html

TODO: Refactor (functions and such)
*/

String.prototype.localizationTable = 'default';

const AccordancePrefs = eval(
  File.readText('~/Library/Preferences/Accordance Preferences/General.apref'),
)[0]; // For default translation & vers notation settings

const bookNameDictionary = File.readJSON(
  Action.path + '/Contents/Resources/booknames.json',
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

function getText(newArgument, argument, translation) {
  let text = LaunchBar.executeAppleScript(
    `tell application "Accordance" to set theResult to «event AccdTxRf» {"${translation}", "${newArgument}", true}`,
  ).trim();

  if (text.startsWith('ERR')) {
    trackFailedTranslation(newArgument, translation);

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

  const reference = `${argument} ${translationName}`;

  paste(text, reference);
}

function paste(text, reference) {
  LaunchBar.hide();

  let format = Action.preferences.format;
  let formattedText = `${text} (${reference})`;

  formattedText =
    format === 'markdown'
      ? `> ${formattedText}`
      : format === 'citation'
        ? `"${text}" ${reference}`
        : formattedText;

  const frontmostAppID = LaunchBar.execute('/bin/bash', './appInfo.sh').trim();

  if (frontmostAppID === 'pro.writer.mac') {
    formattedText = `> ${text} (${reference})`;
  }

  if (frontmostAppID === 'com.ideasoncanvas.mindnode') {
    formattedText = `${text} (${reference})`;
  }

  if (frontmostAppID === 'pro.writer.mac' && Action.preferences.iawriter) {
    return pasteInWriter(formattedText);
  }

  if (
    frontmostAppID === 'com.apple.iWork.Keynote' &&
    Action.preferences.keynote
  ) {
    LaunchBar.setClipboardString(text); // Workaround for stupid Unicode stuff
    return pasteInKeynote(text, reference);
  }

  // TODO: Add location url to the clipboard (accord://read/ELBER#Rom_4,11) … Accordance Paste Helper Action
  return LaunchBar.paste(formattedText);
}

function pasteInWriter(text) {
  LaunchBar.setClipboardString(text);

  // TODO: Implement in Settings
  // const authorName = Action.preferences.iaAuthor;
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
      label: Action.preferences.format.localize() || 'plain'.localize(),
      children: listFormats(),
    },
    {
      title: 'Choose default translation'.localize(),
      icon: 'bookTemplate',
      label: Action.preferences.translation.replace(/°|-LEM/g, ''),
      children: listTranslations({ mode: 'default' }),
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

function listTranslations({ newArgument, argument, mode = 'lookup' } = {}) {
  const isDefaultMode = mode === 'default';
  const translations = File.getDirectoryContents(textModulesPath);
  const failedTranslations =
    mode === 'lookup' ? getFailedTranslations(newArgument) : [];

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
      const isDefault = translation === Action.preferences.translation;
      const isFailed = failedTranslations.includes(translation);

      if (isFailed && !isDefaultMode) return null;

      const item = {
        title: translationName,
        subtitle: argument,
        // alwaysShowsSubtitle: true,
        action: isDefaultMode ? 'setDefaultTranslation' : 'setTranslation',
        actionArgument: {
          newArgument: newArgument,
          argument: argument,
          translation: translation,
        },
        icon:
          isDefault && isDefaultMode ? 'selectedBookTemplate' : 'bookTemplate',
        ...(isLastUsed && !isDefaultMode && { badge: 'recent'.localize() }),
        priority:
          isLastUsed && !isDefaultMode ? 0 : isDefault && isDefaultMode ? 1 : 2,
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

function setTranslation({ newArgument, argument, translation }) {
  Action.preferences.lastUsed = translation;
  return getText(newArgument, argument, translation);
}

function trackFailedTranslation(newArgument, translation) {
  const key = `failedTranslations_${newArgument}`;
  let failed = Action.preferences[key] || [];
  if (!failed.includes(translation)) {
    failed.push(translation);
    Action.preferences[key] = failed;
  }
}

function getFailedTranslations(newArgument) {
  const key = `failedTranslations_${newArgument}`;
  return Action.preferences[key] || [];
}

function clearFailedTranslations(newArgument) {
  const key = `failedTranslations_${newArgument}`;
  delete Action.preferences[key];
}
