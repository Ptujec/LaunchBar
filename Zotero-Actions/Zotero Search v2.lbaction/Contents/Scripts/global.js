/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const dataPath = `${Action.supportPath}/data.json`;
const currentActionVersion = Action.version;
const lastUsedActionVersion = Action.preferences.lastUsedActionVersion ?? '0.1';

// MARK: Data Management

function checkAndUpdateData() {
  let updateJSON = false;

  if (isNewerActionVersion(lastUsedActionVersion, currentActionVersion)) {
    updateJSON = true;
    Action.preferences.lastUsedActionVersion = Action.version;
  }

  if (!File.exists(dataPath)) updateJSON = true;

  const original = `${zoteroDirectory}zotero.sqlite`;
  const copy = `${original}.launchbar`;

  const originalModificationDate = File.modificationDate(original);
  const copyModificationDate = File.modificationDate(copy);

  if (originalModificationDate > copyModificationDate) updateJSON = true;

  if (updateJSON) {
    const output = LaunchBar.execute(
      '/bin/bash',
      './data.sh',
      zoteroDirectory + 'zotero.sqlite',
      updateJSON
    );

    if (output) {
      File.writeText(output, dataPath);

      // Update type mappings when we get fresh data
      const data = loadData();

      const itemTypes = {};
      for (const curr of data.itemTypes) {
        itemTypes[curr.typeName] = curr.itemTypeID;
      }
      Action.preferences.itemTypes = itemTypes;

      const fields = {};
      for (const curr of data.fields) {
        fields[curr.fieldName] = curr.fieldID;
      }
      Action.preferences.fields = fields;

      const creatorTypes = {};
      for (const curr of data.creatorTypes) {
        creatorTypes[curr.creatorType] = curr.creatorTypeID;
      }
      Action.preferences.creatorTypes = creatorTypes;

      return { wasUpdated: true, data };
    }
  }

  return { wasUpdated: false };
}

function loadData() {
  return File.readJSON(dataPath);
}

function isNewerActionVersion(lastUsedActionVersion, currentActionVersion) {
  const lastUsedParts = lastUsedActionVersion.split('.');
  const currentParts = currentActionVersion.split('.');
  for (let i = 0; i < currentParts.length; i++) {
    const a = ~~currentParts[i]; // parse int
    const b = ~~lastUsedParts[i]; // parse int
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

// MARK: Zotero Settings

const zoteroPrefs = getZoteroPrefs();
const zoteroDirectory = `${zoteroPrefs['extensions.zotero.dataDir']}/`;
const storageDirectory = zoteroDirectory + 'storage/';

function getZoteroPrefs() {
  const profilesDir = `${LaunchBar.homeDirectory}/Library/Application Support/Zotero/Profiles`;
  const profile = File.getDirectoryContents(profilesDir)[0];
  const prefsPath = `${profilesDir}/${profile}/prefs.js`;

  let prefsContent;
  try {
    prefsContent = File.readText(
      prefsPath,
      Action.preferences.textEncodingPrefs || 'UTF-8'
    );
  } catch (error) {
    LaunchBar.log(
      error,
      'Trying again after reading the text encoding of "prefs.js".'
    );

    let textEncodingPrefs;

    textEncodingPrefs = LaunchBar.execute(
      '/usr/bin/file',
      '--mime-encoding',
      prefsPath
    )
      .split(':')?.[1]
      .trim();

    if (textEncodingPrefs === 'binary') {
      textEncodingPrefs = LaunchBar.execute(
        '/usr/bin/xattr',
        '-p',
        'com.apple.TextEncoding',
        prefsPath
      )
        .split(';')?.[0]
        .trim();
    }

    prefsContent = File.readText(prefsPath, textEncodingPrefs);

    Action.preferences.textEncodingPrefs = textEncodingPrefs;
  }

  const preferences = {};
  for (const line of prefsContent.split('\n')) {
    const match = line.match(/user_pref\("([^"]+)",\s*(.+)\);/);
    if (match) {
      const [_, prefName, value] = match;
      preferences[prefName] =
        value === 'true'
          ? true
          : value === 'false'
          ? false
          : /^-?\d+$/.test(value)
          ? parseInt(value)
          : value.replace(/['"]/g, '');
    }
  }
  return preferences;
}

// MARK: Action Settings

const lastUsedStyleInZotero = zoteroPrefs['extensions.zotero.export.lastStyle'];
const fallbackStyle = lastUsedStyleInZotero || 'apa';

const pasteHelperInstalled = File.exists(
  '~/Library/Application Support/LaunchBar/Actions/Paste Helper.lbaction/Contents/Scripts/default' // checking for the executable to ensure the action is installed and compiled
);
const fallbackFormat = pasteHelperInstalled ? 'richText' : 'plain';

function settings() {
  const citationFormat = Action.preferences.citationFormat || fallbackFormat;
  const citationStyle = Action.preferences.citationStyle || fallbackStyle;
  const includeZoteroLink = Action.preferences.includeZoteroLink ?? true;

  return [
    {
      title: 'Include Zotero Link',
      subtitle:
        'Include a link to the Zotero item or annotation in the citation.',
      alwaysShowsSubtitle: true,
      badge: includeZoteroLink ? 'On' : 'Off',
      icon: includeZoteroLink
        ? 'zoteroLinkTemplate'
        : 'zoteroLinkDisabledTemplate',
      action: 'toggleZoteroLink',
      actionArgument: { includeZoteroLink },
    },
    {
      title: 'Paste Format',
      subtitle: formatDisplayName(citationFormat),
      alwaysShowsSubtitle: true,
      icon: 'pasteFormatTemplate',
      children: listFormats(),
    },
    {
      title: 'Citation Style',
      subtitle: citationStyle,
      alwaysShowsSubtitle: true,
      icon: 'citeTemplate',
      children: listStyles(),
    },
  ];
}

function listStyles() {
  const stylesDir = zoteroDirectory + 'styles/';
  const currentStyle = Action.preferences.citationStyle || fallbackStyle;

  const files = File.getDirectoryContents(stylesDir, {
    includeHidden: false,
  });

  return files
    .filter((file) => file.endsWith('.csl'))
    .map((file) => {
      const filePath = stylesDir + file;
      const content = File.readText(filePath);

      // Extract title and id using regex
      const titleMatch = content.match(/<title>([^<]+)<\/title>/);
      const idMatch = content.match(/<id>([^<]+)<\/id>/);

      const title = titleMatch ? titleMatch[1].trim() : file;
      const fullId = idMatch ? idMatch[1].trim() : file;
      const id = fullId.split('/').pop() || fullId;

      return {
        title: title,
        subtitle: fullId, // TODO: maybe use just id later
        alwaysShowsSubtitle: true,
        badge: 'Style',
        icon: id === currentStyle ? 'checkTemplate.png' : 'circleTemplate.png',
        action: 'setStyle',
        actionArgument: id,
      };
    })
    .sort((a, b) =>
      a.icon === 'checkTemplate.png'
        ? -1
        : b.icon === 'checkTemplate.png'
        ? 1
        : a.title.localeCompare(b.title)
    );
}

function listFormats() {
  const currentFormat = Action.preferences.citationFormat || fallbackFormat;
  const includeZoteroLink = Action.preferences.includeZoteroLink ?? true;

  const formats = [
    {
      id: 'plain',
      title: 'Plain Text',
      subtitle: includeZoteroLink
        ? 'Link to the Zotero item will be copied to the clipboard.'
        : undefined,
    },
    {
      id: 'richText',
      title: pasteHelperInstalled
        ? 'Rich Text (with fallback to Markdown)'
        : 'Rich Text',
    },
    {
      id: 'markdown',
      title: 'Markdown',
    },
    {
      id: 'html',
      title: 'HTML',
      subtitle: includeZoteroLink
        ? 'Link to the Zotero item is NOT included.'
        : undefined,
    },
  ];

  return formats.map((format) => ({
    title: format.title,
    subtitle: format.subtitle,
    alwaysShowsSubtitle: !!format.subtitle,
    badge: 'Format',
    icon:
      format.id === currentFormat ? 'checkTemplate.png' : 'circleTemplate.png',
    action: 'setFormat',
    actionArgument: format.id,
  }));
}

function formatDisplayName(format) {
  const names = {
    plain: 'Plain Text',
    richText: pasteHelperInstalled
      ? 'Rich Text (with fallback to Markdown)'
      : 'Rich Text',
    markdown: 'Markdown',
    html: 'HTML',
  };
  return names[format] || 'Plain Text';
}

function setFormat(citationFormat) {
  Action.preferences.citationFormat = citationFormat;
  return settings();
}

function setStyle(style) {
  Action.preferences.citationStyle = style;
  return settings();
}

function toggleZoteroLink({ includeZoteroLink }) {
  Action.preferences.includeZoteroLink = !includeZoteroLink;
  return settings();
}

// MARK: Helper Functions

function naturalSort(a, b) {
  const aName = a.path.split('/').pop();
  const bName = b.path.split('/').pop();

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  return collator.compare(aName, bName);
}

function initializeName(name) {
  return name
    .split(' ')
    .map((part, index) => (index === 0 ? part : part.charAt(0) + '.'))
    .join(' ');
}
