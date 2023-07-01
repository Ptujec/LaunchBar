/* 
Accordance Search words Action for LaunchBar
by Christian Bender (@ptujec)
2023-06-29

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
    if (LaunchBar.options.commandKey) {
      return chooseTranslation(argument);
    } else {
      let query = searchOptions(argument);
      LaunchBar.openURL('accord://search;Words?' + encodeURI(query));
    }
    return;
  }

  let allSetting = getLanguage().startsWith('de') ? '[Alle]' : '[All]';

  // Fix for Slovene Unicode Characters (German Umlaute seem to be ok)
  const substrings = ['č', 'ž', 'š', 'Č', 'Ž', 'Š'];
  const suffix = substrings.some((v) => argument.includes(v))
    ? ';Unicode?'
    : '?';

  const query = searchOptions(argument);

  LaunchBar.openURL(
    'accord://research/' + allSetting + suffix + encodeURI(query)
  );
}

function getLanguage() {
  const accPlist = File.readPlist(
    '~/Library/Preferences/com.OakTree.Accordance.plist'
  );
  let lang = accPlist.AppleLanguages;
  if (!lang) {
    const globalPlist = File.readPlist(
      '/Library/Preferences/.GlobalPreferences.plist'
    );
    lang = globalPlist.AppleLanguages.toString();
  }
  return lang.toString();
}

function searchOptions(argument) {
  // Search options:
  // A = <AND>, O = <OR>, N = <NOT>
  query = argument
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
      alwaysShowsSubtitle: true,
      action: 'searchInTranslation',
      actionArgument: {
        translation: translation,
        argument: argument,
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

function searchInTranslation({ translation, argument }) {
  Action.preferences.lastUsed = translation;

  let query = searchOptions(argument);

  LaunchBar.hide();
  LaunchBar.openURL(
    'accord://search/' + encodeURI(translation) + ';Words?' + encodeURI(query)
  );
}
