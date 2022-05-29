/* 
Password Generator Action for LaunchBar
by Christian Bender (@ptujec)
2022-05-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Sources:
- https://github.com/Qreepex/pwgen/blob/main/assets/js/index.js
*/

const prefs = Action.preferences,
  lowerLetters = 'abcdefghijklmnopqrstuvwxyz',
  upperLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers = '0123456789',
  symbols = '~!@#$%?.^&*()_+=|';

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

    var response = LaunchBar.alert(
      pW,
      'Password length: ' +
        pW.length +
        ' characters' +
        "\nImportant: Don't forget to remove the password from your Clipboard History!",
      'Copy & Paste',
      'Cancel'
    );
    switch (response) {
      case 0:
        // Ok … do something
        LaunchBar.setClipboardString(pW);
        LaunchBar.paste(pW); //
      // LaunchBar.clearClipboard();
      case 1:
        // LaunchBar.hide();
        break;
    }
  }
}

// Setting Functions

function showOptions() {
  var numDict = {
      title: 'Numbers',
      label: numbers,
      icon: 'circleTemplate',
      action: 'toggleNum',
    },
    symDict = {
      title: 'Symbols',
      label: symbols,
      icon: 'circleTemplate',
      action: 'toggleSym',
    };

  if (prefs.numbers != false) {
    numDict.icon = 'checkedTemplate';
  }

  if (prefs.symbols != false) {
    symDict.icon = 'checkedTemplate';
  }

  var options = [numDict, symDict];
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
