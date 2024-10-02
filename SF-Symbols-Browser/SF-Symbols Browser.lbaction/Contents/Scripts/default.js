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
  const actionVersion = File.readPlist(infoPlistLocation).CFBundleVersion;
  let createJSON;

  // Check First Run
  if (Action.preferences.firstRun != false) {
    Action.preferences.firstRun = false;
    createJSON = true;
    Action.preferences.firstRunActionVersion = actionVersion;
  } else {
    // Check if Version Number is the same
    if (actionVersion == Action.preferences.firstRunActionVersion) {
      createJSON = false;
    } else {
      createJSON = true;
      Action.preferences.firstRunActionVersion = actionVersion;
    }
  }

  // Create JSON
  if (createJSON == true) {
    const symbols = File.readText(
      Action.path + '/Contents/Resources/sfsymbols.txt'
    ).split(/(?!$)/u);

    const text = File.readText(
      Action.path + '/Contents/Resources/sfsymbols_names.txt'
    ).split('\n');

    const result = [];
    for (let i = 0; i < text.length; i++) {
      const title = text[i];

      const pushData = {
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

  let sfSymbols = File.readJSON(sfSymbolsLocation);

  sfSymbols.sort(function (a, b) {
    // return a.usage < b.usage;
    return b.index < a.index;
  });

  if (File.exists(recentSymbolsLocation)) {
    const recentSymbols = File.readJSON(recentSymbolsLocation);
    sfSymbols = recentSymbols.reverse().concat(sfSymbols);
  }
  return sfSymbols;
}

function action(dict) {
  let recentSymbols = [];

  if (File.exists(recentSymbolsLocation)) {
    recentSymbols = File.readJSON(recentSymbolsLocation);
  }

  let newRecentSymbols = [];

  recentSymbols.forEach(function (item) {
    if (item.title != dict.title) {
      newRecentSymbols.push(item);
    }
  });

  newRecentSymbols.push({
    title: dict.title,
    icon: 'character:' + dict.symbol,
    action: 'action',
    badge: 'recent',
    actionArgument: {
      symbol: dict.symbol,
      title: dict.title,
    },
  });

  if (newRecentSymbols.length > 3) {
    newRecentSymbols.splice(0, 1);
  }

  File.writeJSON(newRecentSymbols, recentSymbolsLocation);

  if (LaunchBar.options.alternateKey) {
    LaunchBar.paste(dict.title);
  } else {
    LaunchBar.paste(dict.symbol);
  }
}
