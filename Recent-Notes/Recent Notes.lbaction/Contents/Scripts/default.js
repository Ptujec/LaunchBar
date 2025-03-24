/* 
Recent Notes Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-24

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
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

  return filteredNotes.map((note) => ({
    title: note.title || 'Untitled',
    subtitle: note.modifiedAt ? new Date(note.modifiedAt).toLocaleString() : '',
    label: note.folder || '',
    alwaysShowsSubtitle: true,
    icon: 'com.apple.Notes',
    url: `notes://showNote?identifier=${note.id}`,
  }));
}
