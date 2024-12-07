/* 
Scratchpad Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-07

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- Create a matching shortcut for iOS
- Restore removed items from backup
*/

String.prototype.localizationTable = 'default';

function run(argument) {
  const fileLocation = Action.preferences.fileLocation;

  if (!fileLocation || LaunchBar.options.alternateKey)
    return fileLocationOptions();

  if (!argument)
    return LaunchBar.options.controlKey
      ? LaunchBar.openURL(File.fileURLForPath(fileLocation))
      : show();

  // New Entry
  let timestamp = new Date();

  let date = new Date(
    timestamp.getTime() - timestamp.getTimezoneOffset() * 60000
  )
    .toISOString()
    .split('T')[0];

  const time = LaunchBar.formatDate(timestamp, {
    timeStyle: 'medium',
    dateStyle: 'none',
  });

  timestamp = `${date}, ${time}`;

  const text = `${File.readText(
    fileLocation
  ).trim()}\n\n${timestamp}: ${argument}`;

  File.writeText(text, fileLocation);

  LaunchBar.hide();
  // return show();
}

function fileLocationOptions() {
  return [
    {
      title: 'Choose File'.localize(),
      action: 'chooseFile',
      icon: 'fileTemplate',
    },
    {
      title: 'Create New File'.localize(),
      action: 'newFile',
      icon: 'newFileTemplate',
    },
  ];
}

function chooseFile() {
  var fileLocation = LaunchBar.executeAppleScript(
    'set _home to path to home folder as string',
    'set _default to _home & "Library:Mobile Documents:" as alias',
    'set _file to choose file with prompt "' +
      'Select a file for this action:'.localize() +
      '" default location _default',
    'set _file to POSIX path of _file'
  ).trim();
  Action.preferences.fileLocation = fileLocation;

  if (Action.preferences.fileLocation != '') {
    LaunchBar.alert(
      'Success!'.localize(),
      'Your source file is '.localize() +
        fileLocation +
        '\n' +
        'You can start adding entries.'.localize()
    );
  } else {
    LaunchBar.alert('Error'.localize(), 'No File. Try again!'.llocal);
  }
}

function newFile() {
  const folderPath = LaunchBar.executeAppleScript(
    'set _home to path to home folder as string',
    'set _default to _home & "Library:Mobile Documents:" as alias',
    'set _folder to choose folder with prompt "' +
      'Select a folder to create the new file in:'.localize() +
      '" default location _default',
    'set _folder to POSIX path of _folder'
  ).trim();

  const fileLocation = folderPath + 'Scratchpad.txt'.localize();

  try {
    File.writeText('# Scratchpad'.localize(), fileLocation);
    Action.preferences.fileLocation = fileLocation;

    if (Action.preferences.fileLocation != '') {
      LaunchBar.alert(
        'Success!'.localize(),
        'Your source file is '.localize() +
          fileLocation +
          '\n' +
          'You can start adding entries.'.localize()
      );
    } else {
      LaunchBar.alert('Error'.localize(), 'No File. Try again!'.localize());
    }
  } catch (exception) {
    LaunchBar.alert(
      'Error while writing text to file: '.localize() + exception
    );
  }
}

function show() {
  const fileLocation = Action.preferences.fileLocation;

  let lines;
  try {
    lines = File.readText(fileLocation).split('\n');
  } catch (e) {
    return fileLocationOptions();
  }

  return lines
    .filter((line) => line !== '')
    .map((line) => ({
      title: line.split(/\d\d: /)[1],
      subtitle: line.split(/\d\d: /)[0].replace(/:$/, ''),
      icon: '_Template',
      action: 'action',
      actionArgument: {
        line,
        title: line.split(/\d\d: /)[1],
      },
      alwaysShowsSubtitle: true,
    }))
    .reverse();
}

function action({ line, title }) {
  // Paste
  if (LaunchBar.options.shiftKey) LaunchBar.paste(title);

  // Delete
  if (LaunchBar.options.commandKey) {
    const fileLocation = Action.preferences.fileLocation;
    const text = File.readText(fileLocation)
      .replace(line, '')
      .replace(/\n\n(\n)+/, '\n\n');

    File.writeText(text, fileLocation);
    return show();
  }

  LaunchBar.displayInLargeType({ string: title });
}

function options(sEntry, sTitle) {
  const fileLocation = Action.preferences.fileLocation;

  if (LaunchBar.options.shiftKey)
    return LaunchBar.openURL(File.fileURLForPath(fileLocation));

  return [
    {
      title: 'Todoist',
      icon: 'todoistTemplate',
      action: 'addToTodoist',
      actionArgument: sTitle,
    },
    {
      title: 'MindNode',
      icon: 'mindnodeTemplate',
      action: 'addToMindNode',
      actionArgument: sTitle,
    },
    {
      title: 'iA Writer',
      icon: 'iATemplate',
      action: 'addToIAWriter',
      actionArgument: sTitle,
    },
    {
      title: 'Day One',
      icon: 'dayoneTemplate',
      action: 'addToDayOne',
      actionArgument: sTitle,
    },
    {
      title: 'Paste'.localize(),
      icon: 'CopyActionTemplate',
      action: 'paste',
      actionArgument: sTitle,
    },
    {
      title: 'Delete'.localize(),
      icon: 'removeTemplate',
      action: 'remove',
      actionArgument: sEntry,
    },
  ];
}

function remove(params) {
  const fileLocation = Action.preferences.fileLocation;
  const text = File.readText(fileLocation)
    .replace(params, '')
    .replace(/\n\n(\n)+/, '\n\n');

  File.writeText(text, fileLocation);
  return show();
}
