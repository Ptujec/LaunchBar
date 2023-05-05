/* 
Phind Search Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (argument == undefined) {
    LaunchBar.hide();
    LaunchBar.openURL('https://www.phind.com');
    return;
  }

  if (LaunchBar.options.commandKey) {
    var clipboard = LaunchBar.getClipboardString().trim();

    var displayClipboard = clipboard;
    if (displayClipboard.length > 500) {
      displayClipboard = displayClipboard.substring(0, 500) + '…';
    }

    var response = LaunchBar.alert(
      argument.trim(),
      '"' + displayClipboard + '"',
      'Ok',
      'Cancel'
    );
    switch (response) {
      case 0:
        argument += '\n' + clipboard;
        break;
      case 1:
        return;
    }
  }

  LaunchBar.hide();
  LaunchBar.openURL(
    'https://www.phind.com/search?q=' +
      encodeURIComponent(argument) +
      '&c=&l=&source=searchbox'
  );
}
