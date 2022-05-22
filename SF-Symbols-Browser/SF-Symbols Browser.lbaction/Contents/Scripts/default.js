/* 
SF Symbols Browser Action for LaunchBar
by Christian Bender (@ptujec)
2022-05-22

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

- https://stackoverflow.com/questions/6484670/how-do-i-split-a-string-into-an-array-of-characters
*/

const sfSymbolsLocation = Action.supportPath + '/sfSymbols.json';
const recentSymbolsLocation = Action.supportPath + '/recentSymbols.json';
const infoPlistLocation = Action.path + '/Contents/Info.plist';

function run() {
  var actionVersion = File.readPlist(infoPlistLocation).CFBundleVersion;

  // Check First Run
  if (Action.preferences.firstRun != false) {
    Action.preferences.firstRun = false;
    var createJSON = true;
    Action.preferences.firstRunActionVersion = actionVersion;
  } else {
    // Check if Version Number is the same
    if (actionVersion == Action.preferences.firstRunActionVersion) {
      var createJSON = false;
    } else {
      var createJSON = true;
      Action.preferences.firstRunActionVersion = actionVersion;
    }
  }

  // Create JSON
  if (createJSON == true) {
    var symbols = File.readText(
      Action.path + '/Contents/Resources/sfsymbols.txt'
    ).split(/(?!$)/u);

    var text = File.readText(
      Action.path + '/Contents/Resources/sfsymbols_names.txt'
    ).split('\n');

    var result = [];
    for (var i = 0; i < text.length; i++) {
      var title = text[i];

      var pushData = {
        title: title,
        icon: 'character:' + symbols[i],
        index: i,
        action: 'action',
        actionArgument: {
          symbol: symbols[i],
          title: title,
        },
      };

      result.push(pushData);
    }
    File.writeJSON(result, sfSymbolsLocation);
  }

  var sfSymbols = File.readJSON(sfSymbolsLocation);

  sfSymbols.sort(function (a, b) {
    // return a.usage < b.usage;
    return b.index < a.index;
  });

  if (File.exists(recentSymbolsLocation)) {
    var recentSymbols = File.readJSON(recentSymbolsLocation);
    sfSymbols = recentSymbols.reverse().concat(sfSymbols);
  }
  return sfSymbols;
}

function action(dict) {
  if (File.exists(recentSymbolsLocation)) {
    var recentSymbols = File.readJSON(recentSymbolsLocation);
  } else {
    var recentSymbols = [];
  }

  recentSymbols.push({
    title: dict.title,
    icon: 'character:' + dict.symbol,
    action: 'action',
    badge: 'recent',
    actionArgument: {
      symbol: dict.symbol,
      title: dict.title,
    },
  });

  if (recentSymbols.length > 3) {
    recentSymbols.splice(0, 1);
  }

  File.writeJSON(recentSymbols, recentSymbolsLocation);

  if (LaunchBar.options.alternateKey) {
    LaunchBar.paste(dict.title);
  } else {
    LaunchBar.paste(dict.symbol);
  }
}
