/*
Applescripts for Writing Tools Action for LaunchBar (using Chat GPT) 
by Christian Bender (@ptujec)
2024-12-18
*/

const getFrontmostAS =
  'tell application "System Events" to set _frontmoste to bundle identifier of application processes whose frontmost is true as string';

const getWriterContentAs = `
  try
    tell application "iA Writer"
      set _text to text of document 1
    end tell
    return _text
  on error e
    return "Error: " & e
  end try`;

const getStandardContentAs = `
  try
    tell application "System Events"
      keystroke "a" using command down
      keystroke "c" using command down
      delay 0.1
    end tell
    set _text to the clipboard
    return _text
  on error e
    return "Error: " & e
  end try`;

// IA WRITER PASTE FEATURE APPLESCRIPTS

const pasteEditsFromMenu =
  // `menu "${'Paste Edits from'.localize()}" of menu item "${'Paste Edits from'.localize()}" of menu "${'Edit'.localize()}" of menu bar item "${'Edit'.localize()}" of menu bar 1 of application process "iA Writer"`;
  'menu 1 of menu item 11 of menu 4 of menu bar 1 of application process "iA Writer"';

const showAuthorsAS = `
  tell application "iA Writer" to launch
  tell application "System Events" to return name of menu items of ${pasteEditsFromMenu}`;
