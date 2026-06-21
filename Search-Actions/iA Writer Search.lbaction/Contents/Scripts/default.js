/*
iA Writer Search Action for LaunchBar
by Christian Bender (@ptujec)
2026-06-21

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: Fix default folder location detection
*/

String.prototype.localizationTable = 'default';

function run(argument) {
  if (LaunchBar.options.shiftKey) return chooseFolder();
  const folderPath = Action.preferences.folderLocation || getDefaultFolder();

  if (!argument) {
    const contents = LaunchBar.execute('/bin/ls', '-tA', folderPath)
      .trim()
      .split('\n');

    return contents
      .filter((item) => {
        return item.includes('.txt') || item.includes('.md');
      })
      .map((item) => {
        const path = `${folderPath}/${item}`;
        return {
          title: item,
          path,
        };
      });
  }

  const query = argument.toLowerCase().trim();

  if (!query) return;

  const pathsString = LaunchBar.execute(
    '/usr/bin/mdfind',
    '-onlyin',
    folderPath,
    query,
  ).trim();

  if (pathsString == '') {
    return { title: 'No matches'.localize(), icon: 'alert' };
  }

  const paths = pathsString.split('\n');

  return handleMatches(paths, query);
}

function handleMatches(paths, query) {
  return paths
    .filter((path) => path && !File.isDirectory(path))
    .map((path) => {
      const title = File.displayName(path);

      const subtitle = extractSubtitle(path, query);
      return subtitle
        ? { title, subtitle, path, alwaysShowsSubtitle: true }
        : { title, path };
    })
    .sort((a, b) => {
      const lowerA = a.title.toLowerCase();
      const lowerB = b.title.toLowerCase();
      const subtitleA = (a.subtitle || '').toLowerCase();
      const subtitleB = (b.subtitle || '').toLowerCase();

      // Normalize for matching (removes diacritics)
      const normalizedA = normalizeForMatching(lowerA);
      const normalizedB = normalizeForMatching(lowerB);
      const normalizedSubtitleA = normalizeForMatching(subtitleA);
      const normalizedSubtitleB = normalizeForMatching(subtitleB);
      const normalizedQuery = normalizeForMatching(query);

      const queryWords = query.split(/\s+/).filter((w) => w);
      const normalizedQueryWords = queryWords.map(normalizeForMatching);

      // Count matching words in title and subtitle
      const aWordCountInTitle = normalizedQueryWords.filter((word) =>
        normalizedA.includes(word),
      ).length;
      const bWordCountInTitle = normalizedQueryWords.filter((word) =>
        normalizedB.includes(word),
      ).length;

      const aWordCountInSubtitle = normalizedQueryWords.filter((word) =>
        normalizedSubtitleA.includes(word),
      ).length;
      const bWordCountInSubtitle = normalizedQueryWords.filter((word) =>
        normalizedSubtitleB.includes(word),
      ).length;

      // Check exact phrase matches
      const aExactInTitle = normalizedA.includes(normalizedQuery);
      const bExactInTitle = normalizedB.includes(normalizedQuery);
      const aExactInSubtitle = normalizedSubtitleA.includes(normalizedQuery);
      const bExactInSubtitle = normalizedSubtitleB.includes(normalizedQuery);

      // Tier 1: Exact phrase in title
      if (aExactInTitle !== bExactInTitle) {
        return aExactInTitle ? -1 : 1;
      }

      // Tier 2: Word count in title (more words = higher)
      if (aWordCountInTitle !== bWordCountInTitle) {
        return bWordCountInTitle - aWordCountInTitle;
      }

      // Tier 3: Exact phrase in subtitle
      if (aExactInSubtitle !== bExactInSubtitle) {
        return aExactInSubtitle ? -1 : 1;
      }

      // Tier 4: Word count in subtitle (more words = higher)
      if (aWordCountInSubtitle !== bWordCountInSubtitle) {
        return bWordCountInSubtitle - aWordCountInSubtitle;
      }

      // Tier 5: Alphabetically
      return a.title.localeCompare(b.title);
    });
}

function extractSubtitle(filePath, query) {
  try {
    const text = File.readText(filePath);
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let index = lowerText.indexOf(lowerQuery);
    let matchLen = query.length;

    // If exact phrase not found, search for first word match
    if (index === -1) {
      const words = lowerQuery.trim().split(/\s+/);
      for (const word of words) {
        const wordIdx = lowerText.indexOf(word);
        if (wordIdx !== -1) {
          index = wordIdx;
          matchLen = word.length;
          break;
        }
      }
      if (index === -1) return;
    }

    // Expand to word boundaries
    let start = index;
    let end = index + matchLen;
    while (start > 0 && /\S/.test(text[start - 1])) start--;
    while (end < text.length && /\S/.test(text[end])) end++;

    // Add 2 words of context in both directions
    const skipWordBackward = (pos) => {
      while (pos > 0 && /\s/.test(text[pos - 1])) pos--;
      while (pos > 0 && /\S/.test(text[pos - 1])) pos--;
      return pos;
    };
    const skipWordForward = (pos) => {
      while (pos < text.length && /\s/.test(text[pos])) pos++;
      while (pos < text.length && /\S/.test(text[pos])) pos++;
      return pos;
    };

    let contextStart = skipWordBackward(skipWordBackward(start));
    let contextEnd = skipWordForward(skipWordForward(end));

    let snippet = text.substring(contextStart, contextEnd);
    if (contextStart > 0) snippet = '…' + snippet;
    if (contextEnd < text.length) snippet = snippet + '…';

    return snippet.replace(/\n/g, ' ').trim();
  } catch (error) {
    return;
  }
}

function normalizeForMatching(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Combining diacritical marks
    .replace(/[\u0250-\u0336]/g, ''); // Extended Latin characters with diacritics
}

function chooseFolder() {
  LaunchBar.hide();
  const newLocation = LaunchBar.executeAppleScript(
    `
    set _home to path to home folder as string
    set _default to _home & "Library:Mobile Documents:" as alias
    set _folder to choose folder with prompt "Select a folder for this action:" default location _default
    set _folder to POSIX path of _folder
    `,
  ).trim();

  if (!newLocation) return;
  Action.preferences.folderLocation = newLocation;
  return;
}

function getDefaultFolder() {
  // let plist, folderPath;
  // try {
  //   plist = File.readPlist(
  //     '~/Library/Containers/pro.writer.mac/Data/Library/Preferences/pro.writer.mac.plist',
  //   );
  // } catch (exception) {
  //   LaunchBar.alert('Error while reading plist: ' + exception);
  //   return;
  // }

  // if (plist.NSOSPLastRootDirectory) {
  //   // Decode the base64 bookmark data
  //   const bookmarkData = plist.NSOSPLastRootDirectory;

  //   // Try to extract URL from bookmark data
  //   try {
  //     const fileURL = File.fileURLForBookmarkData(bookmarkData);
  //     folderPath = File.pathForFileURL(fileURL);
  //   } catch (error) {
  //     // Fallback: try to extract path from raw binary data
  //     LaunchBar.log('Bookmark decode error: ' + error);
  //     folderPath = undefined;
  //   }
  // }

  let folderPath;

  const compiledExists = File.exists(
    `${Action.path}/Contents/Scripts/readBookmarkData`,
  );

  try {
    folderPath = compiledExists
      ? LaunchBar.execute('./readBookmarkData')?.trim()
      : LaunchBar.execute('/usr/bin/swift', './readBookmarkData.swift')?.trim();
  } catch (error) {
    LaunchBar.log(`Error while reading bookmark data: ${error}`);
    folderPath = undefined;
  }

  if (folderPath) Action.preferences.folderLocation = folderPath;
  if (!folderPath) folderPath = chooseFolder();
  return folderPath;
}
