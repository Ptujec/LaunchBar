/* 
RIS Cleanup Action for LaunchBar
by Christian Bender (@ptujec)
2025-07-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://github.com/aurimasv/translators/wiki/RIS-Tag-Map
- https://de.wikipedia.org/wiki/RIS_(Dateiformat)
- https://github.com/zotero/translators/blob/b80ec528f6ac8c17523354b91893e3772d7ff715/RIS.js#L412

TODO:
- If RIS file has multiple ER tags use for sorting?
*/

const TEMP_PATH = '/private/tmp/temp.ris';
const ORIGINAL_TEMP_PATH = '/private/tmp/original.ris';
const TAGS_TO_REMOVE_FILE = `${Action.supportPath}/tagsToRemove.txt`;
const EDITOR_ID = 'com.apple.TextEdit';
const EDITOR_NAME = 'TextEdit';
let lastAPICallTime = 0;
const API_RATE_LIMIT_DELAY = 1500;

function run(path) {
  initializeTagsFile();

  if (LaunchBar.options.commandKey || LaunchBar.options.alternateKey)
    return settings();

  if (Action.preferences.autoCloseEmptyTabs !== false) {
    closeEmptySafariTabs();
  }

  if (!path) {
    if (!File.exists(ORIGINAL_TEMP_PATH)) {
      LaunchBar.alert('No RIS file in temporary storage');
      return;
    }
    path = ORIGINAL_TEMP_PATH;
  } else {
    if (!File.exists(path) || !String(path).endsWith('.ris')) {
      LaunchBar.alert('No valid input! Must be a .ris file');
      return;
    }

    Action.preferences.originalPath = path;
    // Store untouched copy
    const originalContent = File.readText(path);
    File.writeText(originalContent, ORIGINAL_TEMP_PATH);
  }

  const contents = File.readText(path).trim().split('\n');

  const hasVolumeTag = contents.some((line) => line.startsWith('VL'));
  const shouldAutoConvertTitles = isEnglishOrNoLanguageTag(contents);

  const tags = contents
    .filter((item) => filterTags(item, hasVolumeTag))
    .map((item) =>
      formatDate(
        formatAuthor(formatTitle(formatVolume(item), shouldAutoConvertTitles)),
      ),
    );

  File.writeText(tags.join('\n'), TEMP_PATH);
  return show();
}

function show() {
  const contents = File.readText(TEMP_PATH)
    .decodeHTMLEntities()
    .trim()
    .split('\n');

  const titleTagPrefixes = ['T1', 'T2', 'TI', 'TT', 'J2'];

  const result = contents
    .filter((item) => item.trim() !== '')
    .map((item) => {
      const tag = item.trim();
      const isTitleTag = titleTagPrefixes.some((prefix) =>
        tag.startsWith(prefix),
      );
      const hasOriginal = getTitleMapping(tag);

      return {
        title: tag,
        icon: !isTitleTag
          ? 'removeTemplate'
          : hasOriginal
            ? 'revertTemplate'
            : 'convertTemplate',
        action: !isTitleTag
          ? 'remove'
          : hasOriginal
            ? 'revertTitle'
            : 'convertToTitleCase',
        actionArgument: tag,
        isTitleTag,
      };
    })
    .sort((a, b) => {
      if (a.isTitleTag && !b.isTitleTag) return -1;
      if (!a.isTitleTag && b.isTitleTag) return 1;
      if (a.isTitleTag) return a.title.localeCompare(b.title);
      return 0;
    })
    .map(({ isTitleTag, ...item }) => item);

  return [
    {
      title: 'Add to Zotero',
      icon: 'addTemplate',
      action: 'addToZotero',
    },
    {
      title: `Open in ${EDITOR_NAME}`,
      icon: 'editTemplate',
      action: 'editFile',
    },
    ...result,
  ];
}

//  MARK: - Actions

function remove(tag) {
  const text = File.readText(TEMP_PATH).replace(tag, '');
  File.writeText(text, TEMP_PATH);
  return show();
}

function convertToTitleCase(tag) {
  if (LaunchBar.options.commandKey) {
    remove(tag);
    return show();
  }

  const apiKey = getApiKeyFromTrueTitleCase();

  if (!apiKey) {
    return {
      title: 'API Key Missing',
      subtitle: 'True Title Case API key not configured',
      icon: 'alert',
    };
  }

  // Extract the title part (everything after the tag prefix and dash)
  const titleMatch = tag.match(/^([A-Z0-9]{2})\s+-\s+(.+)$/);
  if (!titleMatch) {
    return {
      title: 'Invalid Format',
      subtitle: 'Could not parse title format',
      icon: 'alert',
    };
  }

  const prefix = titleMatch[1];
  const titleText = titleMatch[2];

  try {
    const result = convertToTitleCaseAPI(titleText, apiKey);

    if (!result.success) {
      return {
        title: `Error: ${result.status}`,
        subtitle: result.message,
        icon: 'alert',
      };
    }

    const convertedTag = `${prefix}  - ${result.value}`;

    // Store the original title mapping
    saveTitleMapping(convertedTag, tag);

    const text = File.readText(TEMP_PATH).replace(tag, convertedTag);
    File.writeText(text, TEMP_PATH);

    return show();
  } catch (error) {
    return {
      title: 'Conversion Error',
      subtitle: error.toString(),
      icon: 'alert',
    };
  }
}

function revertTitle(convertedTag) {
  if (LaunchBar.options.commandKey) {
    remove(convertedTag);
    return show();
  }

  const originalTag = getTitleMapping(convertedTag);

  if (!originalTag) {
    return {
      title: 'Original Title Not Found',
      icon: 'alert',
    };
  }

  const text = File.readText(TEMP_PATH).replace(convertedTag, originalTag);
  File.writeText(text, TEMP_PATH);
  clearTitleMapping(convertedTag);

  return show();
}

function convertToTitleCaseAPI(text, apiKey) {
  // Respect API rate limits - wait if necessary
  const now = Date.now();
  const timeSinceLastCall = now - lastAPICallTime;

  if (timeSinceLastCall < API_RATE_LIMIT_DELAY) {
    const delayNeeded = API_RATE_LIMIT_DELAY - timeSinceLastCall;
    LaunchBar.executeAppleScript(`delay ${Math.ceil(delayNeeded / 1000)}`);
  }

  const url = `https://title-case-converter.p.rapidapi.com/v1/TitleCase?title=${encodeURIComponent(text)}&style=AMA&preserveAllCaps=0&tagSpeciesNames=0`;

  const options = {
    headerFields: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'title-case-converter.p.rapidapi.com',
    },
  };

  try {
    const data = HTTP.getJSON(url, options);
    lastAPICallTime = Date.now();

    if (!data || !data.response || !data.data) {
      LaunchBar.log(`API response missing expected structure`);
      return {
        success: false,
        status: 'Invalid Response',
        message: 'Unexpected API response structure',
      };
    }

    const status = data.response.status;
    const message = data.data.message;

    if (status !== 200) {
      LaunchBar.log(`API returned status ${status}: ${message}`);
      return {
        success: false,
        status,
        message,
      };
    }

    return {
      success: true,
      value: data.data.result,
    };
  } catch (error) {
    lastAPICallTime = Date.now();
    LaunchBar.log(`API call error: ${error.toString()}`);
    return {
      success: false,
      status: 'Error',
      message: error.toString(),
    };
  }
}

function getApiKeyFromTrueTitleCase() {
  const preferencesPath =
    '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.TrueTitleCase/Preferences.plist';

  if (File.exists(preferencesPath)) {
    try {
      const prefs = File.readPlist(preferencesPath);
      return prefs.apiKey;
    } catch (error) {
      LaunchBar.log('Error reading preferences: ' + error);
      return;
    }
  }

  return;
}

function saveTitleMapping(convertedTag, originalTag) {
  if (!Action.preferences.titleMappings) {
    Action.preferences.titleMappings = {};
  }
  Action.preferences.titleMappings[convertedTag] = originalTag;
}

function getTitleMapping(convertedTag) {
  if (!Action.preferences.titleMappings) {
    return null;
  }
  return Action.preferences.titleMappings[convertedTag];
}

function clearTitleMapping(convertedTag) {
  if (Action.preferences.titleMappings) {
    delete Action.preferences.titleMappings[convertedTag];
  }
}

function isEnglishOrNoLanguageTag(contents) {
  const laLine = contents.find((line) => line.startsWith('LA  - '));

  if (!laLine) {
    return true;
  }

  const language = laLine
    .replace(/LA\s+-\s+/, '')
    .trim()
    .toLowerCase();
  return language.startsWith('eng');
}

function addToZotero() {
  LaunchBar.hide();
  LaunchBar.openURL(File.fileURLForPath(TEMP_PATH), 'org.zotero.zotero');
  deleteFile();
}

function editFile() {
  LaunchBar.hide();
  deleteFile();
  LaunchBar.openURL(File.fileURLForPath(ORIGINAL_TEMP_PATH), EDITOR_ID);
}

function deleteFile() {
  LaunchBar.executeAppleScript(`
    tell application "Finder"
      set _file to POSIX file "${Action.preferences.originalPath}"
      delete _file
    end tell
    `);
}

//  MARK: - Helpers

function closeEmptySafariTabs() {
  const isSafariRunning = LaunchBar.execute(
    '/bin/sh',
    '-c',
    'lsappinfo info -only bundleid com.apple.Safari',
  );

  if (isSafariRunning) {
    LaunchBar.executeAppleScript(`
      tell application "Safari"
        set windowList to windows
        repeat with wRef in windowList
          set tabList to tabs of wRef
          repeat with tRef in tabList
            if URL of tRef = missing value then
              delete tRef
            end if
          end repeat
        end repeat
      end tell
    `);
  }
}

function filterTags(item, hasVolumeTag) {
  if (item.match(/^[A-Z0-9]{2}\s+-\s*$/)) return false; // Filter out tags with nothing after the first dash (including trailing spaces)

  if (!hasVolumeTag && item.startsWith('NV')) return false;

  if (Action.preferences.autoRemoveTags !== false) {
    const customTags = getCustomtagsToRemove();
    if (
      customTags.length > 0 &&
      customTags.some((tag) => item.startsWith(tag))
    ) {
      return false;
    }
  }

  return true;
}

function formatTitle(item, shouldAutoConvertTitles = true) {
  if (
    ['T1', 'T2', 'TI', 'TT', 'J2'].some((prefix) => item.startsWith(prefix))
  ) {
    // Apply true title case conversion based on language tag check
    // Always converts for English documents (or when no language tag is present)
    if (shouldAutoConvertTitles) {
      const apiKey = getApiKeyFromTrueTitleCase();
      if (apiKey) {
        const titleMatch = item.match(/^([A-Z0-9]{2})\s+-\s+(.+)$/);
        if (titleMatch) {
          const prefix = titleMatch[1];
          const titleText = titleMatch[2];

          try {
            const result = convertToTitleCaseAPI(titleText, apiKey);

            if (result.success) {
              const originalTag = item;
              item = `${prefix}  - ${result.value}`;
              saveTitleMapping(item, originalTag);
            } else {
              LaunchBar.log(
                `Title conversion failed for ${prefix}: ${result.message}`,
              );
            }
          } catch (e) {
            LaunchBar.log(`Title conversion error for ${prefix}: ${e}`);
          }
        }
      }
    }
  }
  item = item.replace(/\s+:/g, ':').trim();

  return item;
}

function formatAuthor(item) {
  if (!Action.preferences.autoFormatAuthors) return item;

  if (item.startsWith('A1')) {
    const matches = item.match(/(A1  - )?([a-zöäüßčžš?']+),(.*?)(,|$)/gi);
    if (matches) {
      return matches
        .map((author) => author.replace(/(,| )*$/g, ''))
        .join('\nA1  - ');
    }
  }

  if (item.startsWith('A2')) {
    return item.replace(/(,|\.| )*$/g, '').replace(/,, /g, '\nA2  - ');
  }

  if (item.startsWith('AU') && !item.includes(',')) {
    return item.replace(/(AU  - )(.*?)([a-züäößžčš]+)$/gi, '$1$3, $2');
  }

  return item;
}

function formatDate(item) {
  if (item.startsWith('Y1')) return item.replace(/^Y1/g, 'DA');
  return item;
}

function formatVolume(item) {
  if (item.startsWith('VL')) {
    // First replace any leading zeros
    item = item.replace(/VL\s+-\s+0*(\d+)/g, 'VL  - $1');

    // Then handle Roman numerals
    return item.replace(
      /VL\s+-\s+([IVXLCDM]+)/gi,
      (_, roman) => `VL  - ${romanToNumber(roman.toUpperCase())}`,
    );
  }
  return item;
}

function romanToNumber(str) {
  const romanValuesMap = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

  return str.match(/[IVXLCDM]/g).reduce((acc, val, i, arr) => {
    const [curr, next] = [romanValuesMap[val], romanValuesMap[arr[i + 1]] || 0];
    return acc + (curr < next ? -curr : curr);
  }, 0);
}

function initializeTagsFile() {
  if (!File.exists(TAGS_TO_REMOVE_FILE)) {
    const templatePath = `${Action.path}/Contents/Resources/tagsToRemove.txt`;
    if (File.exists(templatePath)) {
      const templateContent = File.readText(templatePath);
      File.writeText(templateContent, TAGS_TO_REMOVE_FILE);
    }
  }
}

function getCustomtagsToRemove() {
  if (!File.exists(TAGS_TO_REMOVE_FILE)) return [];

  const content = File.readText(TAGS_TO_REMOVE_FILE);
  const tags = content
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('--')) // Skip empty lines and comments
    .join('')
    .split(',')
    .map((tag) => tag.trim().toUpperCase())
    .filter((tag) => tag); // Remove empty tags

  return tags;
}

//  MARK: - Settings

function settings() {
  const customTags = getCustomtagsToRemove();
  const autoFormatAuthors = Action.preferences.autoFormatAuthors || false;
  const autoFormatTitles = Action.preferences.autoFormatTitles || false;
  const autoRemoveTags = Action.preferences.autoRemoveTags !== false;
  const autoCloseEmptyTabs = Action.preferences.autoCloseEmptyTabs !== false;

  return [
    {
      title: 'Close Empty Safari Tabs',
      icon: autoCloseEmptyTabs ? 'checkTemplate' : 'circleTemplate',
      action: 'autoCloseEmptyTabsToggle',
      badge: autoCloseEmptyTabs ? 'On' : undefined,
    },
    {
      title: 'Format Titles',
      subtitle: 'Remove spaces and auto convert to title case',
      alwaysShowsSubtitle: true,
      icon: autoFormatTitles ? 'checkTemplate' : 'circleTemplate',
      action: 'autoFormatTitlesToggle',
      badge: autoFormatTitles ? 'On' : undefined,
    },
    {
      title: 'Format Authors',
      subtitle: 'Ensure last name, first name format',
      alwaysShowsSubtitle: true,
      icon: autoFormatAuthors ? 'checkTemplate' : 'circleTemplate',
      action: 'autoFormatAuthorsToggle',
      badge: autoFormatAuthors ? 'On' : undefined,
    },

    customTags.length > 0
      ? {
          title: 'Remove Tags',
          subtitle: customTags.join(', '),
          alwaysShowsSubtitle: true,
          icon: autoRemoveTags ? 'checkTemplate' : 'circleTemplate',
          action: 'autoRemoveTagsToggle',
          badge: autoRemoveTags ? 'On' : undefined,
        }
      : undefined,
    {
      title: File.exists(TAGS_TO_REMOVE_FILE)
        ? 'Manage Tags to Remove'
        : 'Add Tags to Remove',
      icon: 'editTemplate',
      action: 'editTagList',
    },
  ];
}

function autoCloseEmptyTabsToggle() {
  Action.preferences.autoCloseEmptyTabs =
    Action.preferences.autoCloseEmptyTabs === false;
  return settings();
}

function autoRemoveTagsToggle() {
  // If undefined or true, set to false; if false, set to true
  Action.preferences.autoRemoveTags =
    Action.preferences.autoRemoveTags === false;
  return settings();
}

function autoFormatTitlesToggle() {
  Action.preferences.autoFormatTitles = !Action.preferences.autoFormatTitles;
  return settings();
}

function autoFormatAuthorsToggle() {
  Action.preferences.autoFormatAuthors = !Action.preferences.autoFormatAuthors;
  return settings();
}

function editTagList() {
  LaunchBar.hide();
  LaunchBar.openURL(File.fileURLForPath(TAGS_TO_REMOVE_FILE), EDITOR_ID);
}
