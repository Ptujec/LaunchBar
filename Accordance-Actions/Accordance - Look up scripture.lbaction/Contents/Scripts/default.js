/*
Accordance Look Up Action for LaunchBar
by Christian Bender (@ptujec)
2026-11-24

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://accordancefiles2.com/helpfiles/14-macOS/index.htm#t=mac_14%2Fcontent%2Ftopics%2F05_dd%2Fusing_links_common_tasks.htm&rhsearch=url&rhhlterm=url%20urls (See: Examples of Accordance-specific URLs)

Versification specification:
- https://github.com/youversion/versification-specification/

The Original Accordance Automation Script Library:
- http://macbiblioblog.blogspot.com/2009/01/downloads.html
*/

String.prototype.localizationTable = 'default';

const AccordancePrefs = eval(
  File.readText('~/Library/Preferences/Accordance Preferences/General.apref'),
)[0]; // For default translation & vers notation settings

const accordanceDefaultSearchText =
  AccordancePrefs['com.oaktree.settings.general.defaultsearchtext'];

const bookData = File.readJSON(`${Action.path}/Contents/Resources/books.json`); // Add your language's names to the "alt" arrays of "aliases".

const textModulesPath =
  '~/Library/Application Support/Accordance/Modules/Texts/';

// MARK: - Run Function

function run(argument) {
  if (LaunchBar.options.shiftKey) return settings();

  const text = argument.trim().split('\n').join('; '); // E.g. for results with multiple verses separated by new lines from YouVersion Action

  // Check Vers Notation Setting (see checkbox in "Appearance" section of Accordance Preferences)
  const { searchReference, input } = isEuropeanVersNotation()
    ? parseEuropeanVersNotation(text)
    : parseDefaultVersNotation(text);

  return LaunchBar.options.commandKey
    ? translationItems({ searchReference, input, mode: 'lookup' })
    : lookUpOptions(searchReference);
}

function parseDefaultVersNotation(argument) {
  const shouldNormalize =
    isAutoNormalizationEnabled() && /\d,\d/.test(argument);
  const input = shouldNormalize
    ? convertVerses(argument, getVerseMaps().baseToEnglish, ':')
    : argument;

  return { searchReference: input, input };
}

function parseEuropeanVersNotation(argument) {
  const cleaned = argument
    .trim()
    .replace(/\(|\)/g, '') // remove brackets
    .replace(/\s+/g, ' '); // remove multiple spaces

  const usesEnglishVerses = cleaned.includes(':');
  const autoNormalize = usesEnglishVerses && isAutoNormalizationEnabled();

  // makes sure non-european styles get converted
  const withCommas = usesEnglishVerses
    ? cleaned.replace(/,/g, '.').replace(/:/g, ',')
    : cleaned;
  const input = autoNormalize
    ? convertVerses(withCommas, getVerseMaps().englishToBase, ',')
    : withCommas;

  // convert book names and clean up for accordance (special treatment for the pentateuch)
  const searchReference = input
    .replace(/([a-zžščöäüß]+(?: [a-zžščöäüß]+)?)/gi, (match, p1) =>
      p1 != 'f' && p1 != 'ff' ? replaceBookName(p1) : p1,
    )
    .replace(/\.( ?[a-zžščöäüß])/gi, '$1')
    .replace(/([a-zžščöäüß])\./gi, '$1')
    .replace(/1 ?Moses/g, 'Genesis')
    .replace(/2 ?Moses/g, 'Exodus')
    .replace(/3 ?Moses/g, 'Leviticus')
    .replace(/4 ?Moses/g, 'Numbers')
    .replace(/5 ?Moses/g, 'Deuteronomy');

  return { searchReference, input };
}

function lookUpOptions(searchReference) {
  LaunchBar.hide();

  searchReference = normalizeVersification(
    searchReference,
    accordanceDefaultSearchText,
  );

  const chapterVerseSeparator = isEuropeanVersNotation() ? ',' : ':';

  // Smart options - choosing between read and research based on input
  if (
    searchReference.endsWith('f') ||
    searchReference.includes('-') ||
    searchReference.includes('–') ||
    searchReference.includes(';') ||
    !searchReference.includes(chapterVerseSeparator)
  ) {
    LaunchBar.openURL(`accord://read?${encodeURI(searchReference)}`);
    return;
  }

  const allTextSetting = getUILanguage().startsWith('de')
    ? '[Alle_Texte];Verses?'
    : '[All_Texts];Verses?';

  LaunchBar.openURL(
    `accord://research/${allTextSetting}${encodeURI(searchReference)}`,
  );
}

function translationItems({ searchReference, input, mode = 'lookup' } = {}) {
  const normalized = getNormalizedTranslations();
  const actionsByMode = {
    lookup: 'selectTranslation',
    normalization: 'toggleNormalization',
  };

  return File.getDirectoryContents(textModulesPath)
    .map((translationFile) => {
      const [translation, extension] = translationFile.split('.');
      let translationName = translation;

      if (extension === 'atext') {
        const moduleDir = `${textModulesPath}${translation}.atext`;
        const plistPath = File.exists(`${moduleDir}/Info.plist`)
          ? `${moduleDir}/Info.plist`
          : `${moduleDir}/ExtraInfo.plist`;
        const plist = File.readPlist(plistPath);
        translationName =
          plist['com.oaktree.module.humanreadablename'] ??
          plist['com.oaktree.module.fullmodulename'] ??
          translationName;
      }

      translationName = formatTranslationTitle(translationName);

      const isLastUsed = translation === Action.preferences.lastUsedTranslation;
      const isNormalized = normalized.includes(translation);
      const isNormalizationMode = mode === 'normalization';
      const prioritiesByMode = {
        lookup: isLastUsed ? 0 : 2,
        normalization: isNormalized ? 1 : 2,
      };

      const icon =
        isNormalizationMode && isNormalized
          ? 'selectedBookTemplate'
          : 'bookTemplate';

      const item = {
        title: translationName,
        ...(mode === 'lookup' && input && { subtitle: input }),
        action: actionsByMode[mode],
        actionArgument: { searchReference, translation },
        icon,
        ...(mode === 'lookup' && isLastUsed && { badge: 'recent'.localize() }),
        priority: prioritiesByMode[mode],
      };

      return item;
    })
    .sort((a, b) =>
      a.priority !== b.priority
        ? a.priority - b.priority
        : a.title.localeCompare(b.title),
    )
    .map(({ priority, ...item }) => item);
}

function selectTranslation({ searchReference, translation }) {
  Action.preferences.lastUsedTranslation = translation;

  LaunchBar.hide();
  LaunchBar.openURL(
    `accord://read/${encodeURI(translation)}?${encodeURI(normalizeVersification(searchReference, translation))}`,
  );
}

function replaceBookName(bookName) {
  // Replace alternative booknames and abbreviations with the english name so Accordance can parse it correctly
  bookName = bookName.trim().toLowerCase();

  const foundBook = bookData.aliases.find((book) => {
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

function formatTranslationTitle(translation) {
  return translation
    .trim()
    .replace(/°|-LEM/g, '')
    .replace('ZJ', 'ŽJ')
    .replace('ZNZ', 'ŽNZ')
    .replace('ESVS', 'ESV')
    .replace(/\d+$/g, '');
}

// MARK: Settings

function settings() {
  return [
    {
      title: 'Set normalization for translations'.localize(),
      subtitle: 'Applied to all references.'.localize(),
      alwaysShowsSubtitle: true,
      badge: String(getNormalizedTranslations().length),
      icon: 'symbol:arrow.triangle.swap',
      action: 'showNormalizationTranslations',
      actionReturnsItems: true,
    },
    {
      title: 'Automatic Reference Normalization'.localize(),
      subtitle:
        'Applied to references with non-default chapter/verse separators.'.localize(),
      alwaysShowsSubtitle: true,
      icon: isAutoNormalizationEnabled() ? 'checkTemplate' : 'circleTemplate',
      action: 'toggleAutoNormalization',
    },
  ];
}

// MARK: Normalization

// Matches "Book 51,7" or "Book 51:7" with optional verse range; skips cross-chapter ranges.
const REFERENCE_PATTERN =
  /((?:[1-3] ?)?[a-zžščöäüß]+(?: [a-zžščöäüß]+)*)\s+(\d+)([:,.])(\d+)(-\d+)?(?!\d|[:,.]\d|-\d+[:,.])/gi;

function showNormalizationTranslations() {
  return translationItems({ mode: 'normalization' });
}

function toggleNormalization({ translation }) {
  const normalized = getNormalizedTranslations();
  Action.preferences.normalizedTranslations = normalized.includes(translation)
    ? normalized.filter((t) => t !== translation)
    : [...normalized, translation];
  return translationItems({ mode: 'normalization' });
}

function getNormalizedTranslations() {
  return Action.preferences.normalizedTranslations || [];
}

function isEuropeanVersNotation() {
  return (
    AccordancePrefs['com.oaktree.settings.general.useeuropeanversenotation'] !==
    0
  );
}

function isAutoNormalizationEnabled() {
  return Action.preferences.autoNormalize !== false;
}

function toggleAutoNormalization() {
  Action.preferences.autoNormalize = !isAutoNormalizationEnabled();
  return settings();
}

// European notation means the input uses base numbering, so it is converted to English and vice versa.
function normalizeVersification(reference, translation) {
  if (!getNormalizedTranslations().includes(translation)) return reference;

  const { englishToBase, baseToEnglish } = getVerseMaps();
  const verseMap = isEuropeanVersNotation() ? baseToEnglish : englishToBase;

  return convertVerses(reference, verseMap);
}

// Rewrites verse numbers in a reference using verseMap, optionally forcing a separator.
function convertVerses(reference, verseMap, outSeparator) {
  return reference.replace(
    REFERENCE_PATTERN,
    (match, bookName, chapter, separator, verse, range) => {
      const bookId = findBookId(bookName);
      if (!bookId) return match;

      const start = Number(verse);
      const end = range ? Number(range.slice(1)) : start;
      const verses = [];

      for (let v = start; v <= end; v++) {
        const key = `${bookId} ${chapter}:${v}`;
        const [, mappedChapter, mappedVerse] = (verseMap[key] ?? key).match(
          / (\d+):(\d+)$/,
        );
        verses.push({
          chapter: Number(mappedChapter),
          verse: Number(mappedVerse),
        });
      }

      const groups = [];
      for (const { chapter: c, verse: v } of verses) {
        const last = groups[groups.length - 1];
        if (last && last.chapter === c && last.end + 1 === v) {
          last.end = v;
        } else {
          groups.push({ chapter: c, start: v, end: v });
        }
      }

      const unchanged =
        groups.length === 1 &&
        groups[0].chapter === Number(chapter) &&
        groups[0].start === start &&
        groups[0].end === end;
      if (
        unchanged &&
        (outSeparator === undefined || outSeparator === separator)
      )
        return match;

      return groups
        .map(
          ({ chapter: c, start: s, end: e }) =>
            `${bookName} ${c}${outSeparator ?? separator}${s === e ? s : `${s}-${e}`}`,
        )
        .join('; ');
    },
  );
}

// Expands eng.json verse mappings in both directions, e.g. PSA 51:5 <-> PSA 51:7.
function getVerseMaps() {
  if (getVerseMaps.cache) return getVerseMaps.cache;

  const { mappedVerses } = File.readJSON(
    `${Action.path}/Contents/Resources/standard-mappings/eng.json`,
  );
  const englishToBase = {};
  const baseToEnglish = {};

  for (const [english, base] of Object.entries(mappedVerses)) {
    const englishVerses = expandVerses(english);
    const baseVerses = expandVerses(base);
    if (
      !englishVerses ||
      !baseVerses ||
      englishVerses.length !== baseVerses.length
    )
      continue;

    englishVerses.forEach((verse, i) => {
      englishToBase[verse] = baseVerses[i];
      baseToEnglish[baseVerses[i]] = verse;
    });
  }

  getVerseMaps.cache = { englishToBase, baseToEnglish };
  return getVerseMaps.cache;
}

// Expands "PSA 46:0-11" into ["PSA 46:0", ..., "PSA 46:11"]; returns undefined for lettered verses like "ESG 1:1a".
function expandVerses(ref) {
  const match = ref.match(/^(\w+) (\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return;

  const [, book, chapter, start, end = start] = match;
  return Array.from(
    { length: Number(end) - Number(start) + 1 },
    (_, i) => `${book} ${chapter}:${Number(start) + i}`,
  );
}

function findBookId(bookName) {
  const name = compactName(replaceBookName(bookName));
  return Object.keys(bookData.books).find((id) => {
    const { full, abbr } = bookData.books[id].en;
    return [full, abbr].some((n) => compactName(n) === name);
  });
}

function compactName(name) {
  return name.replace(/\s/g, '').toLowerCase();
}
