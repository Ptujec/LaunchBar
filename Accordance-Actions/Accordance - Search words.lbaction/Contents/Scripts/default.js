/*
Accordance Search words Action for LaunchBar
by Christian Bender (@ptujec)
2026-05-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- http://www.accordancebible.com/Accordance-1043-Is-Automagical/
- https://accordancefiles2.com/helpfiles/14-macOS/index.htm#t=mac_14%2Fcontent%2Ftopics%2F05_dd%2Fusing_links_common_tasks.htm&rhsearch=url&rhhlterm=url%20urls (See: Examples of Accordance-specific URLs)

The Original Accordance Automation Script Library:
- http://macbiblioblog.blogspot.com/2009/01/downloads.html
*/

const textModulesPath =
  '~/Library/Application Support/Accordance/Modules/Texts/';

function run(argument) {
  // Mode (search or research)
  if (argument.includes('#') || LaunchBar.options.commandKey) {
    if (LaunchBar.options.commandKey) return chooseTranslation(argument);

    LaunchBar.openURL(
      `accord://search;Words?${encodeURI(searchOptions(argument))}`,
    );
    return;
  }

  const allSetting = getUILanguage().startsWith('de') ? '[Alle]' : '[All]';

  // Fix for Slovene Unicode Characters (German Umlaute seem to be ok)
  const substrings = ['č', 'ž', 'š', 'Č', 'Ž', 'Š'];
  const suffix = substrings.some((v) => argument.includes(v))
    ? ';Unicode?'
    : '?';

  LaunchBar.openURL(
    `accord://research/${allSetting}${suffix}${encodeURI(searchOptions(argument))}`,
  );
}

function searchOptions(argument) {
  /*
  Search options:
  A = <AND>, O = <OR>, N = <NOT>
  */
  let query = argument
    .trim()
    .replace(/(:)\s+/, '$1')
    .replace(/\s+(#)/, '$1')
    .replace(/\sO\s/g, '<OR>')
    .replace(/\sA\s/g, '<AND>')
    .replace(/\sN\s/g, '<NOT>');

  // Replace spaces with <AND> except if the query is in quotation marks
  if (!query.includes('"')) query = query.replace(/\s/g, '<AND>');

  return query;
}

function chooseTranslation(argument) {
  const translations = File.getDirectoryContents(textModulesPath);

  return translations
    .map((translationFile) => {
      const [translation, extension] = translationFile.split('.');

      let translationName;
      if (extension === 'atext') {
        let plistPath = `${textModulesPath}${translation}.atext/Info.plist`;
        if (!File.exists(plistPath)) {
          plistPath = `${textModulesPath}${translation}.atext/ExtraInfo.plist`;
        }
        const plist = File.readPlist(plistPath);
        translationName =
          plist['com.oaktree.module.humanreadablename'] ??
          plist['com.oaktree.module.fullmodulename'] ??
          translation.trim().replace('°', '');
      } else {
        translationName = translation.trim().replace('°', '');
      }

      const badge =
        translation === Action.preferences.lastUsed
          ? 'recent'.localize()
          : undefined;

      return {
        title: translationName,
        subtitle: argument,
        action: 'searchInTranslation',
        actionArgument: { translation, argument },
        badge,
        icon: 'bookTemplate',
      };
    })

    .sort((a, b) => {
      if (a.badge) return -1;
      if (b.badge) return 1;
      return a.title.localeCompare(b.title);
    });
}

function searchInTranslation({ translation, argument }) {
  Action.preferences.lastUsed = translation;

  LaunchBar.hide();
  LaunchBar.openURL(
    `accord://search/${encodeURI(translation)};Words?${encodeURI(searchOptions(argument))}`, // NOTE: does not handle šumnike correctly … I reported this here: https://support.accordancebible.com/hc/en-us/community/posts/50159326235803-Issue-with-Slovene-unicode-characters-in-search-url
  );
}

function getUILanguage() {
  const accPlist = File.readPlist(
    '~/Library/Preferences/com.OakTree.Accordance.plist',
  );
  let lang = accPlist.AppleLanguages;

  if (!lang) {
    const globalPlist = File.readPlist(
      '/Library/Preferences/.GlobalPreferences.plist',
    );
    lang = globalPlist.AppleLanguages;
  }

  return lang?.[0] || 'en';
}
