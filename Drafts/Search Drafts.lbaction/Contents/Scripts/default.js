/* 
Recent Drafts Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-24

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const databasePath = `${LaunchBar.homeDirectory}/Library/Group Containers/GTFQ98J4YG.com.agiletortoise.Drafts/DraftStore.sqlite`;

function run(argument) {
  if (!argument) return;
  // if (LaunchBar.options.commandKey) {
  //   LaunchBar.openURL(`drafts://x-callback-url/search?query=${argument}`);
  //   return;
  // }

  return showDrafts(argument);
}

function showDrafts(argument) {
  const result = LaunchBar.execute(
    '/bin/bash',
    './parseDataBase.sh',
    databasePath,
    argument || ''
  );

  if (!result) {
    LaunchBar.alert('Error reading database. No result.');
    return;
  }

  try {
    return formatDrafts(JSON.parse(result), argument);
  } catch (error) {
    LaunchBar.alert('Error parsing database:', error.message);
    return;
  }
}

function formatDrafts(drafts, searchTerm) {
  const regex = new RegExp(searchTerm, 'gi');

  return drafts
    .map(({ content, flag, id }) => {
      const [title = '', ...lines] = content.split('\n');
      const matchingLine = lines.find((line) =>
        line.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return {
        title,
        subtitle: matchingLine
          ? getContextAroundTerm(matchingLine, searchTerm)
          : '',
        alwaysShowsSubtitle: true,
        label: flag ? '⚑' : undefined,
        icon: 'iconTemplate',
        url: `drafts://open?uuid=${id}`,
        matches: (title.match(regex) || []).length,
      };
    })
    .sort((a, b) => b.matches - a.matches);
}

function getContextAroundTerm(line, searchTerm) {
  const words = line.trim().split(/\s+/);
  const matchIndex = words.findIndex((word) =>
    word.toLowerCase().includes(searchTerm.toLowerCase())
  );
  if (matchIndex === -1) return '';

  const maxLen = 53;
  const result = words[matchIndex];
  const before = words.slice(0, matchIndex);
  const after = words.slice(matchIndex + 1);

  const addWords = (text, words, isPrefix) => {
    const wordList = isPrefix ? [...words].reverse() : words;
    const [result, remaining] = wordList.reduce(
      ([acc, remaining], word) => {
        const withSpace = isPrefix ? `${word} ${acc}` : `${acc} ${word}`;
        return withSpace.length <= maxLen
          ? [withSpace, remaining.slice(1)]
          : [acc, remaining];
      },
      [text, wordList]
    );

    return [result, isPrefix ? remaining.reverse() : remaining];
  };

  let final,
    remainingBefore = [],
    remainingAfter = [];

  if (matchIndex === 0) {
    [final, remainingAfter] = addWords(result, after, false);
  } else if (matchIndex === words.length - 1) {
    [final, remainingBefore] = addWords(result, before, true);
  } else {
    [final, remainingBefore] = addWords(result, before, true);
    [final, remainingAfter] = addWords(final, after, false);
  }

  const fullText = [
    remainingBefore.length ? '…' : '',
    final,
    remainingAfter.length && final.length + remainingAfter[0].length > maxLen
      ? '…'
      : '',
  ].join('');

  return fullText.length <= maxLen ? fullText.trim() : fullText;
}
