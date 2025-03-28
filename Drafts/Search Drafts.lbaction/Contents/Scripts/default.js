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
  const sortedDrafts = drafts.sort((a, b) => {
    const regex = new RegExp(searchTerm, 'gi');
    const aMatches = ((a.title || '').match(regex) || []).length;
    const bMatches = ((b.title || '').match(regex) || []).length;

    return bMatches - aMatches;
  });

  return sortedDrafts.map((draft) => {
    let subtitle = '';
    if (draft.content && searchTerm) {
      const matchingLine = draft.content
        .split('\n')
        .find((line) => line.toLowerCase().includes(searchTerm.toLowerCase()));

      if (matchingLine) {
        const context = getContextAroundTerm(matchingLine, searchTerm);
        if (context) {
          subtitle = context;
        }
      }
    }

    return {
      title: draft.title,
      subtitle: subtitle,
      alwaysShowsSubtitle: true,
      icon: 'iconTemplate',
      url: `drafts://open?uuid=${draft.id}`,
    };
  });
}

function getContextAroundTerm(line, searchTerm) {
  const words = line.split(/\s+/);
  const searchWordIndex = words.findIndex((w) =>
    w?.toLowerCase()?.includes(searchTerm?.toLowerCase())
  );
  if (searchWordIndex === -1) return null;

  const maxLen = 53;
  let [start, end] = [searchWordIndex, searchWordIndex + 1];
  let context = words[searchWordIndex];

  while ((start > 0 || end < words.length) && context.length < maxLen) {
    const prevWord = words[start - 1];
    const nextWord = words[end];
    const canAddPrev =
      start > 0 && context.length + prevWord.length + 1 <= maxLen;
    const canAddNext =
      end < words.length && context.length + nextWord.length + 1 <= maxLen;

    if (!canAddPrev && !canAddNext) break;
    if (canAddPrev) context = `${words[--start]} ${context}`;
    if (canAddNext) context = `${context} ${words[end++]}`;
  }

  return `${start > 0 ? '…' : ''}${context}${end < words.length ? '…' : ''}`;
}
