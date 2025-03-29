/* 
Recent Drafts Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const databasePath = `${LaunchBar.homeDirectory}/Library/Group Containers/GTFQ98J4YG.com.agiletortoise.Drafts/DraftStore.sqlite`;

function run() {
  return showDrafts();
}

function showDrafts() {
  const result = LaunchBar.execute(
    '/bin/bash',
    './parseDataBase.sh',
    databasePath
  );

  if (!result) {
    LaunchBar.alert('Error reading database. No result.');
    return;
  }

  try {
    return formatDrafts(JSON.parse(result));
  } catch (error) {
    LaunchBar.alert('Error parsing database:', error.message);
    return;
  }
}

function formatDrafts(drafts) {
  return drafts.map((draft) => {
    const date = draft.modifiedAt
      ? LaunchBar.formatDate(new Date(draft.modifiedAt), {
          relativeDateFormatting: true,
          timeStyle: 'short',
          dateStyle: 'short',
        })
      : '';

    let title = draft.content.trim().split('\n')[0];
    if (!title) return;

    return {
      title,
      subtitle: date,
      // alwaysShowsSubtitle: true,
      label: draft.flag ? '⚑' : undefined,
      icon: 'iconTemplate',
      url: `drafts://open?uuid=${draft.id}`,
    };
  });
}
