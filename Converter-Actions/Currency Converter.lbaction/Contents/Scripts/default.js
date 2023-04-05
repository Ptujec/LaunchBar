/* 
Currency Converter Action for LaunchBar
by Christian Bender (@ptujec)
2023-04-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation
- https://exchangeratesapi.io/documentation/
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http/ 

Potential Features:
- Group seperators
- Copy Results automatically to the clipboard (including rate and such)
- Show results in detailed view on enter
*/

const apiKey = Action.preferences.apiKey;
const ratesDataPath = Action.supportPath + '/localRatesData.json';
const currencyList = File.readJSON(
  Action.path + '/Contents/Resources/currencyList.json'
).symbols;

const todayDate = new Date().toISOString().split('T')[0];
const apiURL = '';

var base = Action.preferences.base;
if (base == undefined) {
  base = 'USD';
}

var targetCurrencies = Action.preferences.targetCurrencies;
if (targetCurrencies == undefined) {
  targetCurrencies = [];
}

var baseSetting = {
  title: 'Choose base currency',
  icon: 'settings',
  // children: baseCurrencyList(),
  action: 'baseCurrencyList',
};

var favsSetting = {
  title: 'Choose target currencies',
  icon: 'settings',
  // children: baseCurrencyList(),
  action: 'favsCurrencyList',
};

function run(argument) {
  // CHECK FOR VALID API ACCESS KEY
  if (apiKey == undefined) {
    setApiKey();
    return;
  }

  // SHOW SETTINGS
  if (argument == undefined) {
    return settings();
  }

  // RUN MAIN ACTION
  return main(argument);
}

function main(argument) {
  //
  if (argument != undefined) {
    // MATCHING AMOUNT FROM THE INPUT (also allows to start with ".1")
    argument = argument.replace(/^(,|\.)/g, '0$1').match(/\d+[,\.]?(?:\d+)?/);

    if (argument == undefined) {
      return;
    }

    argument = argument[0];

    var decimalSeparator = Action.preferences.decimalSeparator;
    var usesCommaSeparator = false;

    if (argument.toString().includes(',') || decimalSeparator == ',') {
      var usesCommaSeparator = true;
      argument = parseFloat(argument.trim().replace(/\,/g, '.'));
    }
  }

  var result = [];
  var rates = getRatesData().data.rates;
  // Because of API restricitons the base has be calculated from how it relates to EUR (which is the base in the API)
  var baseToEuroRate = rates[base];
  var oneBaseUnitInEuro = 1 / baseToEuroRate;

  if (targetCurrencies == '') {
    return [favsSetting];
  }

  if (targetCurrencies == base) {
    return settings();
  }

  targetCurrencies.forEach(function (targetCurrency) {
    if (targetCurrency != base) {
      var targetToEuroRate = rates[targetCurrency];
      var oneTargetUnitInEuro = 1 / targetToEuroRate;

      var baseToTarget = oneBaseUnitInEuro * targetToEuroRate;
      var targetToBase = oneTargetUnitInEuro * baseToEuroRate;

      var targetResult = (argument * baseToTarget).toFixed(2);
      var baseResult = (argument * targetToBase).toFixed(2);

      var titleTargetResult = targetResult;
      var titleBaseResult = baseResult;
      var labelTargetResult =
        argument +
        ' ' +
        base +
        ' is ' +
        targetResult +
        ' ' +
        targetCurrency +
        ' (Rate: ' +
        baseToTarget.toFixed(2) +
        ')';

      var labelBaseResult =
        argument +
        ' ' +
        targetCurrency +
        ' is ' +
        baseResult +
        ' ' +
        base +
        ' (Rate: ' +
        targetToBase.toFixed(2) +
        ')';

      if (usesCommaSeparator == true) {
        titleTargetResult = titleTargetResult.replace(/\./g, ',');
        labelTargetResult = labelTargetResult.replace(/\./g, ',');
        titleBaseResult = titleBaseResult.replace(/\./g, ',');
        labelBaseResult = labelBaseResult.replace(/\./g, ',');
      }

      result.push(
        {
          title: titleTargetResult,
          subtitle: labelTargetResult,
          icon: 'result',
          badge: base + ' → ' + targetCurrency,
        },
        {
          title: titleBaseResult,
          subtitle: labelBaseResult,
          icon: 'result',
          badge: targetCurrency + ' → ' + base,
        }
      );
    }
  });

  return result;
}

function settings() {
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

  if (base != undefined) {
    baseSetting.badge = base;
  }

  if (targetCurrencies != '') {
    favsSetting.badge = targetCurrencies.join(', ');
  }

  return [favsSetting, baseSetting, decimalSeparatorSetting, setAPISetting];
}

function toogleDecimalSeparator(separator) {
  Action.preferences.decimalSeparator = separator;
  return settings();
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
  return baseCurrencyList();
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

function getRatesData() {
  // Check stored rates are from today to see if a new API call is needed
  var makeAPICall = true;

  if (File.exists(ratesDataPath)) {
    var localRatesData = File.readJSON(ratesDataPath);
    if (localRatesData.data != undefined) {
      var rateInfoDate = localRatesData.data.date;
      if (todayDate == rateInfoDate) {
        makeAPICall = false;
      }
    }
  }

  if (makeAPICall == true) {
    var ratesData = HTTP.getJSON(
      'https://api.apilayer.com/exchangerates_data/latest',
      {
        headerFields: {
          apikey: apiKey,
        },
      }
    );

    if (ratesData.response.status != 200) {
      if (ratesData.data.message != undefined) {
        var details = ratesData.data.message;
      }
      if (ratesData.data.error != undefined) {
        var details = ratesData.data.error;
      }

      if (details == undefined) {
        details = ratesData.response.localizedStatus;
      }

      LaunchBar.alert(ratesData.response.status + ': ' + details);
      return;
    }

    // Store data to reduce API calls
    File.writeJSON(ratesData, ratesDataPath);
  } else {
    var ratesData = localRatesData;
  }

  if (ratesData.response == undefined) {
    return;
  }

  return ratesData;
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
      LaunchBar.openURL(
        'https://apilayer.com/marketplace/exchangerates_data-api'
      );
      LaunchBar.hide();
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
