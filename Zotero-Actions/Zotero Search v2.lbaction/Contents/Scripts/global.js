/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const dataPath = `${Action.supportPath}/data.json`;
const currentActionVersion = Action.version;
const lastUsedActionVersion = Action.preferences.lastUsedActionVersion ?? '0.1';

// ZOTERO PREFERENCES

const zoteroPrefs = getZoteroPrefs();
const zoteroDirectory = `${zoteroPrefs['extensions.zotero.dataDir']}/`;
const storageDirectory = zoteroDirectory + 'storage/';

function getZoteroPrefs() {
  const profilesDir = '~/Library/Application Support/Zotero/Profiles';
  const profile = File.getDirectoryContents(profilesDir)[0];
  const prefsPath = `${profilesDir}/${profile}/prefs.js`;
  const prefsContent = File.readText(prefsPath);

  return prefsContent.split('\n').reduce((preferences, line) => {
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
    return preferences;
  }, {});
}

// ACTION SETTINGS

const lastUsedStyleInZotero = zoteroPrefs['extensions.zotero.export.lastStyle'];
const fallbackStyle = lastUsedStyleInZotero || 'apa';

function settings() {
  const citationFormat = Action.preferences.citationFormat || 'plain';
  const citationStyle = Action.preferences.citationStyle || fallbackStyle;

  return [
    {
      title: 'Paste Format',
      subtitle: formatDisplayName(citationFormat),
      alwaysShowsSubtitle: true,
      icon: 'pasteTemplate',
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
  const currentFormat = Action.preferences.citationFormat || 'plain';
  const formats = [
    {
      id: 'plain',
      title: 'Plain Text',
      subtitle: 'The link will be copied to the clipboard.',
    },
    {
      id: 'richText',
      title: 'Rich Text',
    },
    {
      id: 'markdown',
      title: 'Markdown',
    },
    {
      id: 'html',
      title: 'HTML',
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
    richText: 'Rich Text',
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
