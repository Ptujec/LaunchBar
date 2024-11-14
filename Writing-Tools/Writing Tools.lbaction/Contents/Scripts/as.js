/*
Applescripts for Writing Tools Action for LaunchBar (using Chat GPT) 
by Christian Bender (@ptujec)
2024-11-10
*/

const getFrontmostAS =
  'tell application "System Events" to set _frontmoste to bundle identifier of application processes whose frontmost is true as string';

const getWriterContentAs =
  'try\n' +
  ' tell application "iA Writer"\n' +
  '   set _text to text of document 1\n' +
  ' end tell\n' +
  ' return _text\n' +
  'on error e\n' +
  ' return "Error: " & e\n' +
  'end try\n';

const getStandardContentAs =
  'try\n' +
  ' tell application "System Events"\n' +
  '	  keystroke "a" using command down\n' +
  '	  keystroke "c" using command down\n' +
  '	  delay 0.1\n' +
  ' end tell\n' +
  'set _text to the clipboard\n' +
  'return _text\n' +
  'on error e\n' +
  ' return "Error: " & e\n' +
  'end try\n';

// IA WRITER PASTE FEATURE APPLESCRIPTS

const pasteEditsFromMenu =
  // `menu "${'Paste Edits from'.localize()}" of menu item "${'Paste Edits from'.localize()}" of menu "${'Edit'.localize()}" of menu bar item "${'Edit'.localize()}" of menu bar 1 of application process "iA Writer"`;
  'menu 1 of menu item 11 of menu 4 of menu bar 1 of application process "iA Writer"';

const showAuthorsAS =
  'tell application "iA Writer" to launch\n' +
  `tell application "System Events" to return name of menu items of ${pasteEditsFromMenu}`;
