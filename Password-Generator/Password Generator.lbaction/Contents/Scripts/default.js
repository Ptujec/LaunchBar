/* 
Password Generator Action for LaunchBar
by Christian Bender (@ptujec)
2022-05-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Sources:
- https://github.com/Qreepex/pwgen/blob/main/assets/js/index.js

TODO: 
- German Localization
*/

const prefs = Action.preferences,
  lowerLetters = 'abcdefghijklmnopqrstuvwxyz',
  upperLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers = '0123456789',
  symbols = '~!@#$%?.^&*()_+=|',
  clearClipboardAction =
    '~/Library/Application Support/LaunchBar/Actions/Clear Clipboard.lbaction';

// Main Action

function run(argument) {
  if (LaunchBar.options.shiftKey) {
    var output = showOptions();
    return output;
  } else {
    if (argument == undefined) {
      argument = '12';
    }

    var pW = generatePassword(argument);

    var info =
      'Password length: ' +
      pW.length +
      ' characters' +
      "\nHint: Use paste and remove from history (⌃⌥⌘V) to remove the password from LaunchBar's clipboard history!";

    if (File.exists(clearClipboardAction) && prefs.clearClipboard != false) {
      info += '\nThe internal clipboard will be cleared after 90 seconds!';
    }

    var response = LaunchBar.alert(pW, info, 'Copy', 'Cancel');
    switch (response) {
      case 0:
        LaunchBar.setClipboardString(pW);
        LaunchBar.hide();

        if (
          File.exists(clearClipboardAction) &&
          prefs.clearClipboard != false
        ) {
          LaunchBar.performAction('Clear Clipboard'); // runs clear clipboard action when installed … which clears the internal clipboard (not LaunchBar history after a delay of 30 seconds
        }

      case 1:
        // LaunchBar.hide();
        break;
    }
  }
}

// Setting Functions

function showOptions() {
  var numDict = {
      title: 'Include Numbers',
      label: numbers,
      icon: 'circleTemplate',
      action: 'toggleNum',
    },
    symDict = {
      title: 'Include Symbols',
      label: symbols,
      icon: 'circleTemplate',
      action: 'toggleSym',
    };
  clearClipboard = {
    title: 'Clear Internal Clipboard Option',
    icon: 'circleTemplate',
    action: 'toggleClearClipboard',
  };

  if (prefs.numbers != false) {
    numDict.icon = 'checkedTemplate';
  }

  if (prefs.symbols != false) {
    symDict.icon = 'checkedTemplate';
  }

  if (prefs.clearClipboard != false && File.exists(clearClipboardAction)) {
    clearClipboard.icon = 'checkedTemplate';
  }

  var options = [numDict, symDict, clearClipboard];
  return options;
}

function toggleNum() {
  if (prefs.numbers != false) {
    prefs.numbers = false;
  } else {
    prefs.numbers = true;
  }
  var output = showOptions();
  return output;
}

function toggleSym() {
  if (prefs.symbols != false) {
    prefs.symbols = false;
  } else {
    prefs.symbols = true;
  }
  var output = showOptions();
  return output;
}

function toggleClearClipboard() {
  if (!File.exists(clearClipboardAction) && prefs.clearClipboard != false) {
    var response = LaunchBar.alert(
      'Install Clear Clipboard Action',
      'You need to install the complimantary action in order to use this function.',
      'Ok',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          'https://github.com/Ptujec/LaunchBar/tree/master/Password-Generator#clear-clipboard-action'
        );
      case 1:
        break;
    }
  }

  if (File.exists(clearClipboardAction)) {
    if (prefs.clearClipboard != false) {
      prefs.clearClipboard = false;
    } else {
      prefs.clearClipboard = true;
    }
  }

  var output = showOptions();
  return output;
}

// Passwort Generation Functions

function getLowercase() {
  return lowerLetters[Math.floor(Math.random() * lowerLetters.length)];
}

function getUppercase() {
  return upperLetters[Math.floor(Math.random() * upperLetters.length)];
}

function getNumber() {
  return numbers[Math.floor(Math.random() * numbers.length)];
}

function getSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function genRandom() {
  const e = [];
  return (
    e.push(getUppercase()),
    e.push(getLowercase()),
    prefs.numbers != false && e.push(getNumber()),
    prefs.symbols != false && e.push(getSymbol()),
    0 === e.length ? '' : e[Math.floor(Math.random() * e.length)]
  );
}

function generatePassword(argument) {
  let t = '';
  for (let n = 0; n < argument; n++) {
    t += genRandom();
  }
  return t;
}
