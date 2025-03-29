/* 
Recent Notes Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-24

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO:
- pinnend label/badge … show on top
*/

const databasePath = `${LaunchBar.homeDirectory}/Library/Group Containers/group.com.apple.notes/NoteStore.sqlite`;

function run() {
  return showNotes();
}

function showNotes() {
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
    return formatNotes(JSON.parse(result));
  } catch (error) {
    LaunchBar.alert('Error parsing database:', error.message);
    return;
  }
}

function formatNotes(notes) {
  const filteredNotes = LaunchBar.options.commandKey
    ? notes
    : notes.filter((note) => note.folder !== 'Recently Deleted');

  const uniqueFolders = new Set(filteredNotes.map((note) => note.folder)).size;
  const showLabel = uniqueFolders > 1;

  return filteredNotes.map((note) => {
    const date = note.modifiedAt
      ? LaunchBar.formatDate(new Date(note.modifiedAt), {
          relativeDateFormatting: true,
          timeStyle: 'short',
          dateStyle: 'full',
        })
      : '';

    return {
      title: note.title || 'Untitled',
      subtitle: date,
      // alwaysShowsSubtitle: true,
      label: showLabel ? note.folder : undefined,
      icon: 'com.apple.Notes',
      url: `notes://showNote?identifier=${note.id}`,
    };
  });
}
