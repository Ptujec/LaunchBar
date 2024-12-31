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
  let timestamp = new Date().toISOString();

  const text = `${File.readText(fileLocation).trim()}\n${timestamp} ${argument
    .replace(/\n/g, ' ')
    .trim()}`;

  File.writeText(text, fileLocation);
  LaunchBar.hide();
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
    LaunchBar.log('Error while writing text to file: '.localize() + exception);
  }
}

function show() {
  const fileLocation = Action.preferences.fileLocation;

  let lines;
  try {
    lines = File.readText(fileLocation).split('\n');
  } catch (e) {
    LaunchBar.log('Error while reading file: ' + e);
    return fileLocationOptions();
  }

  const results = lines
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      let title, timestamp;

      try {
        const components = line.split(' ');
        title = components.slice(1).join(' ');
        timestamp = components[0];
      } catch (e) {
        LaunchBar.log('Error while parsing line: ' + e);
        return null;
      }

      const subtitle = LaunchBar.formatDate(new Date(timestamp), {
        timeStyle: 'medium',
        dateStyle: 'short',
      });

      return {
        title,
        subtitle,
        icon: '_Template',
        action: 'action',
        actionArgument: { line, title },
        alwaysShowsSubtitle: true,
      };
    })
    .reverse();

  return results.length > 0
    ? results
    : { title: 'No entries'.localize(), icon: 'alert' };
}

function action({ line, title }) {
  // Paste
  if (LaunchBar.options.shiftKey) return LaunchBar.paste(title);

  // Delete
  if (LaunchBar.options.commandKey) {
    const fileLocation = Action.preferences.fileLocation;
    const text = File.readText(fileLocation).replace(line, '');
    File.writeText(text, fileLocation);
    return show();
  }

  LaunchBar.displayInLargeType({ string: title });
}
