/* 
⌘ Unicode Function Keys Action for LaunchBar
by Christian Bender (@ptujec)
2022-05-21

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  var keys = File.readJSON(
    Action.path + '/Contents/Resources/function_keys.json'
  );

  var result = [];

  keys.forEach(function (item) {
    var allNames = [item.title, item.local.de.title].concat(
      item.altNames.concat(item.local.de.altNames)
    );

    if (LaunchBar.currentLocale == 'de') {
      var title = item.local.de.title;
      var sub = item.local.de.altNames
        .concat([item.title].concat(item.altNames))
        .join(', ');
    } else {
      var title = item.title;
      sub = item.altNames.join(', ');
    }

    var character = item.character;

    var pushData = {
      title: title,
      subtitle: sub,
      icon: 'character:' + character,
      // label: item.unicodeName,
      action: 'paste',
      actionArgument: {
        character: character,
        htmlEntity: item.htmlEntity,
      },
    };

    if (argument != undefined) {
      allNames.forEach(function (item) {
        if (item.toLowerCase().includes(argument.toLowerCase())) {
          if (!result.includes(pushData)) {
            result.push(pushData);
          }
        }
      });
    } else {
      // if (character == Action.preferences.lastUsed) {
      //   pushData.lastUsed = '0';
      //   pushData.badge = 'Used Last Time';
      // } else {
      //   pushData.lastUsed = '1';
      // }
      result.push(pushData);
    }
  });

  // result.sort(function (a, b) {
  //   return a.lastUsed - b.lastUsed;
  // });

  return result;
}

function paste(dict) {
  // Action.preferences.lastUsed = character;
  if (LaunchBar.options.alternateKey) {
    LaunchBar.paste(dict.htmlEntity);
  } else if (LaunchBar.options.shiftKey) {
    LaunchBar.paste('`' + dict.character + '`');
  } else {
    LaunchBar.paste(dict.character);
  }
}
