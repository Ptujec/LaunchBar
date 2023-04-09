/* 
Currency Converter Action for LaunchBar
by Christian Bender (@ptujec)
2023-04-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation
- https://apilayer.com/marketplace/exchangerates_data-api
- https://exchangeratesapi.io/documentation/ (old version)
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http/ 

Potential Features:
- Group seperators
- Copy Results automatically to the clipboard (including rate and such)
*/
String.prototype.localizationTable = 'default';

include('global.js');

function run(argument) {
  // CHECK FOR VALID API ACCESS KEY
  if (apiKey == undefined) {
    setApiKey();
  }

  // SHOW SETTINGS
  if (LaunchBar.options.shiftKey) {
    // Shift is the only modifier that seems to work when live feedback is enabled
    return settings();
  }

  if (argument == undefined) {
    return;
  }

  // RUN MAIN ACTION
  return main(argument);
}

function main(argument) {
  // MATCHING AMOUNT FROM THE INPUT (also allows to start with ".1")
  argument = argument.replace(/^(,|\.)/g, '0$1').match(/\d+[,\.]?(?:\d+)?/);

  if (argument == undefined) {
    return;
  }

  argument = argument[0];

  var decimalSeparator = Action.preferences.decimalSeparator;
  var usesCommaSeparator = false;

  if (argument.includes(',') || decimalSeparator == ',') {
    usesCommaSeparator = true;
    argument = parseFloat(argument.trim().replace(/\,/g, '.'));
  }

  var result = [];
  var rates = getRatesData().data.rates;
  // Because of API restricitons the base has be calculated from how it relates to EUR (which is the base in the API)
  var baseToEuroRate = rates[base];
  var oneBaseUnitInEuro = 1 / baseToEuroRate;

  if (targetCurrencies == '') {
    // return [targetsSetting];
    return [targetsSetting, baseSetting];
  }

  if (targetCurrencies == base) {
    return [baseSetting, targetsSetting];
  }

  targetCurrencies.forEach(function (targetCurrency) {
    if (targetCurrency != base) {
      var targetToEuroRate = rates[targetCurrency];
      var oneTargetUnitInEuro = 1 / targetToEuroRate;

      var baseToTarget = oneBaseUnitInEuro * targetToEuroRate;
      var targetToBase = oneTargetUnitInEuro * baseToEuroRate;

      var targetResult = (argument * baseToTarget).toFixed(2);
      var baseResult = (argument * targetToBase).toFixed(2);

      var subTargetResult =
        argument +
        ' ' +
        base +
        ' is '.localize() +
        targetResult +
        ' ' +
        targetCurrency +
        ' (Rate: '.localize() +
        baseToTarget.toFixed(4) +
        ')';

      var subBaseResult =
        argument +
        ' ' +
        targetCurrency +
        ' is '.localize() +
        baseResult +
        ' ' +
        base +
        ' (Rate: '.localize() +
        targetToBase.toFixed(4) +
        ')';

      result.push(
        {
          title: targetResult,
          subtitle: subTargetResult,
          icon: 'result',
          badge: base + ' → ' + targetCurrency,
          action: 'showDetails',
          actionArgument: {
            result: targetResult,
            target: targetCurrency,
            rate: baseToTarget.toFixed(4).toString(),
            argument: argument.toString(),
            base: base,
            usesCommaSeparator: usesCommaSeparator,
          },
        },
        {
          title: baseResult,
          subtitle: subBaseResult,
          icon: 'result',
          badge: targetCurrency + ' → ' + base,
          action: 'showDetails',
          actionArgument: {
            result: baseResult,
            target: base,
            rate: targetToBase.toFixed(4).toString(),
            argument: argument.toString(),
            base: targetCurrency,
            usesCommaSeparator: usesCommaSeparator,
          },
        }
      );
    }
  });

  if (usesCommaSeparator == true) {
    result.forEach(function (item) {
      item.title = item.title.toString().replace(/\./g, ',');
      item.subtitle = item.subtitle.toString().replace(/\./g, ',');
    });
  }

  return result;
}

function showDetails(dict) {
  // PASTE
  if (LaunchBar.options.shiftKey) {
    LaunchBar.paste(dict.result);
    return;
  }

  // SHOW DETAILS
  var details = [
    {
      title: dict.result,
      badge: dict.target,
      icon: 'result',
    },
    {
      title: dict.rate,
      badge: 'Rate'.localize(),
      icon: 'rate',
      action: 'openURL',
      actionArgument: {
        argument: dict.argument,
        base: dict.base,
        target: dict.target,
      },
    },
    {
      title: dict.argument,
      badge: dict.base,
      icon: 'from',
    },
  ];

  if (dict.usesCommaSeparator == true) {
    details.forEach(function (item) {
      item.title = item.title.replace(/\./g, ',');
    });
  }

  var localDataInfo = getLocalDataInfo(); // [dataDate, apiUsageStats]

  var info = {
    title: 'Refresh'.localize(),
    icon: 'refreshTemplate',
    action: 'refreshAlert',
    actionArgument: dict.argument,
  };

  if (localDataInfo != undefined) {
    if (localDataInfo[0] != undefined) {
      info.subtitle = 'Last update: '.localize() + localDataInfo[0];

      if (localDataInfo[1] != undefined) {
        info.subtitle = info.subtitle + localDataInfo[1];
      }
    }
  }
  details.push(info);

  return details;
}

function openURL(dict) {
  var url =
    'https://www.google.com/finance/quote/' +
    dict.base +
    '-' +
    dict.target +
    '?window=1M';

  LaunchBar.hide();
  LaunchBar.openURL(url);
}

// SETTING FUNCTIONS

function settings() {
  var base = Action.preferences.base;
  baseSetting = {
    title: 'Choose base currency'.localize(),
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
    title: 'Toogle decimal separator'.localize(),
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
    title: 'Set API key'.localize(),
    icon: 'keyTemplate',
    action: 'setApiKey',
  };

  var settingItems = [
    targetsSetting,
    baseSetting,
    decimalSeparatorSetting,
    setAPISetting,
  ];

  var localDataInfo = getLocalDataInfo();

  var info = {
    title: 'Manual data refresh'.localize(),
    icon: 'refreshTemplate',
    action: 'refreshAlert',
    actionArgument: 'settings',
  };

  if (localDataInfo[0] != undefined) {
    info.subtitle = 'Last update: '.localize() + localDataInfo[0];

    if (localDataInfo[1] != undefined) {
      info.subtitle = info.subtitle + localDataInfo[1];
    }
  }
  settingItems.push(info);

  return settingItems;
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

function targetCurrencyList() {
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

  return targetCurrencyList();
}

function removeTarget(symbol) {
  targetCurrencies.forEach(function (item, index) {
    if (item == symbol) {
      targetCurrencies.splice(index, 1);
    }
  });
  return targetCurrencyList();
}

function toogleDecimalSeparator(separator) {
  Action.preferences.decimalSeparator = separator;
  return settings();
}

function getLocalDataInfo() {
  if (File.exists(ratesDataPath)) {
    var ratesData = File.readJSON(ratesDataPath);
    if (ratesData == undefined || ratesData.response == undefined) {
      return;
    }

    if (ratesData.response.status == 200) {
      var dataDate = LaunchBar.formatDate(
        new Date(ratesData.data.timestamp * 1000),
        {
          relativeDateFormatting: true,
          timeStyle: 'long',
          dateStyle: 'short',
        }
      );

      var hFields = ratesData.response.headerFields;

      if (hFields['ratelimit-remaining'] != undefined) {
        var remaining = hFields['ratelimit-remaining'];
        var limit = hFields['ratelimit-limit'];
        var used = limit - remaining;
        var apiUsageStats =
          ' (API Usage: '.localize() + used + '/' + limit + ')';
      }
    }
  }
  return [dataDate, apiUsageStats];
}

function refreshAlert(arg) {
  var response = LaunchBar.alert(
    'Confirm to refresh!'.localize(),
    'Every refresh counts against your API usage. Currency rates are updated automatically if the local data has not been updated within the last 4 hours.'.localize(),
    'Ok',
    'Cancel'.localize()
  );
  switch (response) {
    case 0:
      APICall();
      if (arg == 'settings') {
        return settings();
      } else {
        return main(arg); // show results again with updated data
      }
    case 1:
      break;
  }
}

function getRatesData() {
  var makeAPICall = true;

  // Check if a new API call is needed
  if (File.exists(ratesDataPath)) {
    var localRatesData = File.readJSON(ratesDataPath);
    if (localRatesData.data != undefined) {
      var localDataUnixTimestamp = localRatesData.data.timestamp;
      var nowUnixTimestamp = Math.floor(new Date().getTime() / 1000);
      var difference = nowUnixTimestamp - localDataUnixTimestamp;
      if (difference < 14400) {
        // If less than 4 hours have passed since the time the exchange rate information that is stored locally was collected don't make an API call.  You can change this number to make more or less calls.
        makeAPICall = false;
      }
    }
  }

  if (makeAPICall == true) {
    var ratesData = APICall();
  } else {
    var ratesData = localRatesData;
  }

  if (ratesData.response == undefined) {
    return;
  }

  return ratesData;
}

function APICall() {
  var ratesData = HTTP.getJSON(
    'https://api.apilayer.com/exchangerates_data/latest',
    {
      headerFields: {
        apikey: apiKey,
      },
    }
  );

  if (ratesData.response == undefined) {
    LaunchBar.alert(ratesData.error);
    return;
  }

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
  return ratesData;
}

function setApiKey() {
  var response = LaunchBar.alert(
    'API key required'.localize(),
    'This actions requires an API key. Press "Open Website" to get yours from APILayer.com.\nCopy the key to your clipboard, run the action again and press "Set API key"'.localize(),
    'Open Website'.localize(),
    'Set API key'.localize(),
    'Cancel'.localize()
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
