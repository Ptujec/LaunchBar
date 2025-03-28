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
  const filteredDrafts = LaunchBar.options.commandKey
    ? drafts
    : drafts.filter((draft) => draft.folder !== 'Recently Deleted');

  const uniqueFolders = new Set(filteredDrafts.map((draft) => draft.folder))
    .size;
  const showLabel = uniqueFolders > 1;

  return filteredDrafts.map((draft) => {
    const date = draft.modifiedAt
      ? LaunchBar.formatDate(new Date(draft.modifiedAt), {
          relativeDateFormatting: true,
          timeStyle: 'short',
          dateStyle: 'full',
        })
      : '';

    return {
      title: draft.title || 'Untitled',
      subtitle: date,
      alwaysShowsSubtitle: true,
      label: showLabel ? draft.folder : undefined,
      icon: 'iconTemplate',
      url: `drafts://open?uuid=${draft.id}`,
    };
  });
}
