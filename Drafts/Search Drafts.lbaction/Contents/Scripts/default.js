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
    encodeURIComponent(argument)
  );

  // LaunchBar.log(result);

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
      const [title = '', ...lines] = content.trim().split('\n');
      const matchingLine = [title, ...lines].find((line) =>
        line.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const subtitle = matchingLine
        ? getContextAroundTerm(matchingLine, searchTerm)
        : '';

      return {
        title,
        subtitle: subtitle !== title ? subtitle : '',
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
  const words = line.trim().replace(/\s+/g, ' ').split(' ');
  const matchIndex = words.findIndex((word) =>
    word.toLowerCase().includes(searchTerm.toLowerCase())
  );
  if (matchIndex === -1) return '';

  const maxLen = 53;
  const matchWord = words[matchIndex];
  if (matchWord.length > maxLen) return `${matchWord.slice(0, maxLen - 1)}…`;

  let result = [matchWord];
  let leftSpace = maxLen - matchWord.length;
  let left = words.slice(0, matchIndex).reverse();
  let right = words.slice(matchIndex + 1);

  while ((left.length || right.length) && leftSpace > 0) {
    const [nextLeft] = left;
    const [nextRight] = right;
    const addLeft = nextLeft && nextLeft.length + 1 <= leftSpace;
    const addRight = nextRight && nextRight.length + 1 <= leftSpace;

    if (addLeft) {
      result.unshift(left.shift());
      leftSpace -= nextLeft.length + 1;
    }
    if (addRight && leftSpace > 0) {
      result.push(right.shift());
      leftSpace -= nextRight.length + 1;
    }
    if (!addLeft && !addRight) break;
  }

  return `${left.length ? '…' : ''}${result.join(' ')}${
    right.length ? '…' : ''
  }`;
}
