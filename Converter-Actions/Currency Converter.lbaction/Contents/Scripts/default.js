/* 
Currency Converter Action for LaunchBar
by Christian Bender (@ptujec)
2023-04-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

App ID
- https://openexchangerates.org/account/app-ids

Documentation
- https://docs.openexchangerates.org/reference/api-introduction
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http/ 

*/
String.prototype.localizationTable = 'default';

include('global.js');

function run(argument) {
  // CHECK FOR VALID API ACCESS KEY
  if (apiKey == undefined) {
    setAppID();
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
  // CHECK FOR NUMBERS IN INPUT
  if (/\d/.test(argument) == false) {
    return;
  }

  // CLEAN UP ARGUMENT
  if (argument.startsWith(',')) {
    argument = 0 + argument;
  }

  argument = argument
    .match(/[\d,.]+/)[0] // Get amount numbers (commas, points and numbers in arbitrary order)
    .replace(/(?<=\d)(,|\.)(?=\d{3})/g, ''); // Strip group separators

  if (argument.includes(',')) {
    argument = parseFloat(argument.replace(/\,/g, '.'));
  }

  // DO THE CONVERTING
  var result = [];
  var ratesData = getRatesData();

  if (ratesData == undefined) {
    return;
  }

  var rates = ratesData.data.rates;

  // The base is calculated from how it relates to USD (which is the base in the API)

  var baseToUSDRate = rates[base] / rates['USD']; //
  var oneBaseUnitInUSD = 1 / baseToUSDRate;

  if (targetCurrencies == '') {
    return [targetsSetting, baseSetting];
  }

  if (targetCurrencies == base) {
    return [baseSetting, targetsSetting];
  }

  targetCurrencies.forEach(function (targetCurrency) {
    if (targetCurrency != base) {
      var targetToUSDRate = rates[targetCurrency];
      var oneTargetUnitInUSD = 1 / targetToUSDRate;

      var baseToTarget = oneBaseUnitInUSD * targetToUSDRate;
      var targetToBase = oneTargetUnitInUSD * baseToUSDRate;
      var targetResult = argument * baseToTarget;
      var baseResult = argument * targetToBase;

      var displayArgument = parseFloat(argument).toLocaleString(
        cLocale,
        minMaxFractionDefault
      );

      result.push(
        {
          title: targetResult.toLocaleString(cLocale, {
            style: 'currency',
            currency: targetCurrency,
          }),
          label:
            'Rate: '.localize() +
            baseToTarget.toLocaleString(cLocale, minMaxFractionRate),
          icon: 'result',
          badge: base + ' → ' + targetCurrency,
          action: 'showDetails',
          actionArgument: {
            result: targetResult.toLocaleString(cLocale, minMaxFractionDefault),
            paste: targetResult.toLocaleString(cLocale, {
              style: 'currency',
              currency: targetCurrency,
            }),
            target: targetCurrency,
            rate: baseToTarget.toLocaleString(cLocale, minMaxFractionRate),
            argument: displayArgument,
            base: base,
          },
        },
        {
          title: baseResult.toLocaleString(cLocale, {
            style: 'currency',
            currency: base,
          }),
          label:
            'Rate: '.localize() +
            targetToBase.toLocaleString(cLocale, minMaxFractionRate),
          // subtitle: subBaseResult,
          icon: 'result',
          badge: targetCurrency + ' → ' + base,
          action: 'showDetails',
          actionArgument: {
            result: baseResult.toLocaleString(cLocale, minMaxFractionDefault),
            paste: baseResult.toLocaleString(cLocale, {
              style: 'currency',
              currency: base,
            }),
            target: base,
            rate: targetToBase.toLocaleString(cLocale, minMaxFractionRate),
            argument: displayArgument,
            base: targetCurrency,
          },
        }
      );
    }
  });

  return result;
}

function showDetails(dict) {
  // PASTE
  if (LaunchBar.options.shiftKey) {
    LaunchBar.paste(dict.paste);
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
      action: 'rateAction',
      actionArgument: {
        argument: dict.argument,
        base: dict.base,
        target: dict.target,
        rate: dict.rate,
      },
    },
    {
      title: dict.argument,
      badge: dict.base,
      icon: 'from',
    },
  ];

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

      // if (localDataInfo[1] != undefined) {
      //   info.subtitle = info.subtitle + localDataInfo[1];
      // }
    }
  }
  details.push(info);

  return details;
}

function rateAction(dict) {
  if (LaunchBar.options.shiftKey) {
    LaunchBar.paste(dict.rate);
    return;
  }

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

  var setAPISetting = {
    title: 'Set App ID'.localize(),
    icon: 'keyTemplate',
    action: 'setAppID',
  };

  var settingItems = [targetsSetting, baseSetting, setAPISetting];

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
  var base = Action.preferences.base ?? 'USD';

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

      // var hFields = ratesData.response.headerFields;
      // if (hFields['x-ratelimit-remaining-quota-month'] != undefined) {
      //   var remaining = hFields['x-ratelimit-remaining-quota-month'];
      //   var limit = hFields['x-ratelimit-limit-monthly-month'];
      //   var used = limit - remaining;
      //   var apiUsageStats =
      //     ' (API Usage: '.localize() + used + '/' + limit + ')';
      // }
    }
  }
  // return [dataDate, apiUsageStats];
  return [dataDate];
}

function refreshAlert(arg) {
  var alertTitle = 'Confirm to refresh!'.localize();
  var difference = compareDates();

  // Check if a new API call is needed
  if (difference != undefined && difference < 3600) {
    // If less than 1 hour has passed there is no need to make a new API call unless the user is on a paid plan.
    alertTitle +=
      '\nYour local data has already been updated within the last hour.'.localize();
  }

  var response = LaunchBar.alert(
    alertTitle,
    'Every refresh counts against your API usage. Open exchange rates provides hourly updates and allows 1,000 requests per month on their free plan. Local currency rates are updated automatically if they have not been updated within the last 2 hours.'.localize(),
    'Ok',
    'Usage stats'.localize(),
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
      LaunchBar.hide();
      LaunchBar.openURL('https://openexchangerates.org/account/usage');
      break;
    case 2:
      break;
  }
}

function getRatesData() {
  var makeAPICall = true;

  // Check if a new API call is needed
  var difference = compareDates();
  if (difference != undefined && difference < 7200) {
    // If less than 2 hours have passed since the time the exchange rate information that is stored locally was collected don't make an API call.  You can change this number to make more or less calls.
    makeAPICall = false;
  }

  if (makeAPICall == true) {
    var ratesData = APICall();
  } else {
    if (File.exists(ratesDataPath)) {
      var localRatesData = File.readJSON(ratesDataPath);
      var ratesData = localRatesData;
    }
  }
  return ratesData;
}

function compareDates() {
  if (File.exists(ratesDataPath)) {
    var localRatesData = File.readJSON(ratesDataPath);
    if (localRatesData.data != undefined) {
      var localDataUnixTimestamp = localRatesData.data.timestamp;
      var nowUnixTimestamp = Math.floor(new Date().getTime() / 1000);
      var difference = nowUnixTimestamp - localDataUnixTimestamp;
    }
  }
  return difference;
}

function APICall() {
  var ratesData = HTTP.getJSON(
    'https://openexchangerates.org/api/latest.json',
    {
      headerFields: {
        Authorization: 'Token ' + apiKey,
      },
    }
  );

  if (ratesData.response == undefined) {
    LaunchBar.alert(ratesData.error);
    return;
  }

  if (ratesData.response.status != 200) {
    if (ratesData.data != undefined) {
      if (ratesData.data.message != undefined) {
        if (
          ratesData.data.message == 'invalid_app_id' ||
          ratesData.data.message == 'missing_app_id'
        ) {
          var showAPIDialog = true;
        }
      }

      if (ratesData.data.description != undefined) {
        var details = ratesData.data.description;
      }
    }

    LaunchBar.alert(
      ratesData.response.status,
      details ?? ratesData.response.localizedStatus
    );

    if (showAPIDialog == true) {
      setAppID();
    }
    return;
  }

  // Store data to reduce API calls
  File.writeJSON(ratesData, ratesDataPath);
  return ratesData;
}

function setAppID() {
  var response = LaunchBar.alert(
    'App ID required'.localize(),
    'This actions requires an App ID from openexchangerates.org. Press "Open Website" to get yours.\nCopy the ID to your clipboard, run the action again and press "Set App ID"'.localize(),
    'Open Website'.localize(),
    'Set App ID'.localize(),
    'Cancel'.localize()
  );
  switch (response) {
    case 0:
      LaunchBar.hide();
      LaunchBar.openURL('https://openexchangerates.org/account/app-ids');
      break;
    case 1:
      // Check App ID
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
