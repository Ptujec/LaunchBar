/* 
Every Process Action for LaunchBar
by Christian Bender (@ptujec)
2022-07-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (LaunchBar.options.shiftKey) {
    LaunchBar.executeAppleScript('delay 2');
  }
  var output = list();
  return output;
}

function list() {
  var output = LaunchBar.execute('/bin/ps', '-Ao', 'pid,pcpu,comm').split(/\n/);

  var results = [];
  for (i = 0; i < output.length; i++) {
    var item = output[i];
    var pid = item.replace(/^(.....).(.....).(.*)/, '$1').trim();
    var percent = item.replace(/^(.....).(.....).(.*)/, '$2');
    var path = item.replace(/^(.....).(.....).(.*)/, '$3').trim();
    var title = path.match(/[^/]*[^/]*$/i).toString();
    var val = parseFloat(percent);

    if (title != '') {
      results.push({
        title: title,
        subtitle: path,
        icon: 'com.apple.ActivityMonitor',
        badge: percent + ' %',
        val: val,
        action: 'kill',
        actionArgument: {
          title: title,
          pid: pid,
          path: path,
        },
      });
    }
  }

  results.sort(function (a, b) {
    return a.val < b.val;
  });

  return results;
}

function kill(dict) {
  if (LaunchBar.options.alternateKey) {
    LaunchBar.hide();
    LaunchBar.executeAppleScript(
      'set thePath to POSIX file "' + dict.path + '" as string',
      'tell application "Finder"',
      ' reveal thePath',
      ' activate',
      'end tell'
    );
  } else {
    var response = LaunchBar.alert(
      dict.title + ' (' + dict.pid + ')',
      'Do you want to kill this process?',
      'Yes',
      'Cancel'
    );
    switch (response) {
      case 0:
        // LaunchBar.execute('/bin/kill', dict.pid);
        var error = LaunchBar.executeAppleScript(
          'try',
          ' do shell script "kill ' + dict.pid + '"',
          'on error e',
          ' return e',
          'end try'
        ).trim();

        if (error != '') {
          LaunchBar.alert('Error!', error.split('sh: line 0: ')[1]);
        } else {
          var output = list();
          return output;
        }
      case 1:
        break;
    }
  }
}
