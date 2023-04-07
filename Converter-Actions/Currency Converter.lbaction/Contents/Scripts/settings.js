// GLOBAL SETTING VARIABLES

var base = Action.preferences.base;

if (base == undefined) {
  base = 'USD';
}

var baseSetting = {
  title: 'Choose base currency',
  icon: 'settings',
  badge: 'USD',
  // children: baseCurrencyList(),
  action: 'baseCurrencyList',
};

if (base != undefined) {
  baseSetting.badge = base;
}

var favsSetting = {
  title: 'Choose target currencies',
  icon: 'settings',
  // children: favsCurrencyList(),
  action: 'favsCurrencyList',
};

var targetCurrencies = Action.preferences.targetCurrencies;
if (targetCurrencies == undefined) {
  targetCurrencies = [];
}

if (targetCurrencies != '') {
  favsSetting.badge = targetCurrencies.join(', ');
}

// SETTING FUNCTIONS
function settings() {
  var base = Action.preferences.base;
  baseSetting = {
    title: 'Choose base currency',
    icon: 'settings',
    badge: 'USD',
    // children: baseCurrencyList(),
    action: 'baseCurrencyList',
  };

  if (base != undefined) {
    baseSetting.badge = base;
  }

  var decimalSeparator = Action.preferences.decimalSeparator;

  var decimalSeparatorSetting = {
    title: 'Toogle decimal separator',
    icon: 'settings',
    badge: '.',
    action: 'toogleDecimalSeparator',
    actionArgument: ',',
  };

  if (decimalSeparator != undefined && decimalSeparator == ',') {
    decimalSeparatorSetting.badge = ',';
    decimalSeparatorSetting.actionArgument = '.';
  }

  var setAPISetting = {
    title: 'Set API Key',
    icon: 'keyTemplate',
    action: 'setApiKey',
  };

  return [favsSetting, baseSetting, decimalSeparatorSetting, setAPISetting];
}

function baseCurrencyList() {
  var base = Action.preferences.base;
  if (base == undefined) {
    base = 'USD';
  }

  // PARSE RESULT
  var other = [];
  var currentBase = [];

  for (var i in currencyList) {
    var pushData = {
      title: currencyList[i],
      icon: 'circleTemplate',
      badge: i,
      action: 'setBase',
      actionArgument: i,
    };

    if (i == base) {
      pushData.label = 'base currency';
      pushData.icon = 'checkTemplate';
      currentBase.push(pushData);
    } else {
      other.push(pushData);
    }
  }

  return currentBase.concat(other);
}

function favsCurrencyList() {
  var other = [];
  var favs = [];

  for (var i in currencyList) {
    var pushData = {
      title: currencyList[i],
      icon: 'circleTemplate',
      badge: i,
      action: 'setTarget',
      actionArgument: i,
    };

    if (targetCurrencies.includes(i)) {
      pushData.label = 'target currency';
      pushData.icon = 'checkTemplate';
      pushData.action = 'removeTarget';
      favs.push(pushData);
    } else {
      other.push(pushData);
    }
  }

  return favs.concat(other);
}

function setBase(symbol) {
  Action.preferences.base = symbol;
  return settings();
}

function setTarget(symbol) {
  targetCurrencies.push(symbol);
  Action.preferences.targetCurrencies = targetCurrencies;

  return favsCurrencyList();
}

function removeTarget(symbol) {
  targetCurrencies.forEach(function (item, index) {
    if (item == symbol) {
      targetCurrencies.splice(index, 1);
    }
  });

  //   Action.preferences.targetCurrencies = targetCurrencies;

  return favsCurrencyList();
}

function toogleDecimalSeparator(separator) {
  Action.preferences.decimalSeparator = separator;
  return settings();
}

function setApiKey() {
  var response = LaunchBar.alert(
    'API key required',
    'This actions requires an API key. Press "Open Website" to get yours from APILayer.com.\nCopy the key to your clipboard, run the action again and press »Set API key«',
    'Open Website',
    'Set API key',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.hide();
      LaunchBar.openURL(
        'https://apilayer.com/marketplace/exchangerates_data-api'
      );
      break;
    case 1:
      // Check API Key
      var clipboard = LaunchBar.getClipboardString().trim();

      if (clipboard.length == 32) {
        Action.preferences.apiKey = clipboard;

        LaunchBar.alert(
          'Success!',
          'API Access Key set to: ' + Action.preferences.apiKey
        );

        var firstRun = Action.preferences.firstRun;
        if (firstRun == undefined) {
          Action.preferences.firstRun = false;
          return settings();
        }
      } else {
        LaunchBar.alert(
          'Seems like an incorrect API-key. Make sure it is the most recent item of your clipboard history!'
        );
      }
      break;
    case 2:
      break;
  }
}
