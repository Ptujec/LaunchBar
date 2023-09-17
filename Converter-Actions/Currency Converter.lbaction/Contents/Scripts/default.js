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
  if (!apiKey) setAppID();

  // SHOW SETTINGS
  if (LaunchBar.options.shiftKey) {
    // Shift is the only modifier that seems to work when live feedback is enabled
    return settings();
  }

  if (!argument) return;

  // RUN MAIN ACTION
  return main(argument);
}

function main(argument) {
  // CHECK FOR NUMBERS IN INPUT
  if (/\d/.test(argument) == false) return;

  // CLEAN UP ARGUMENT
  if (argument.startsWith(',')) argument = 0 + argument;

  argument = argument
    .match(/[\d,.]+/)[0] // Get amount numbers (commas, points and numbers in arbitrary order)
    .replace(/(?<=\d)(,|\.)(?=\d{3})/g, ''); // Strip group separators

  if (argument.includes(','))
    argument = parseFloat(argument.replace(/\,/g, '.'));

  // DO THE CONVERTING
  let result = [];
  const ratesData = getRatesData();

  if (!ratesData) return;

  const rates = ratesData.data.rates;

  // The base is calculated from how it relates to USD (which is the base in the API)

  const baseToUSDRate = rates[base] / rates['USD']; //
  const oneBaseUnitInUSD = 1 / baseToUSDRate;

  if (targetCurrencies == '') {
    return [targetsSetting, baseSetting];
  }

  if (targetCurrencies == base) {
    return [baseSetting, targetsSetting];
  }

  targetCurrencies
    .filter((targetCurrency) => targetCurrency != base)
    .forEach((targetCurrency) => {
      const targetToUSDRate = rates[targetCurrency];
      const oneTargetUnitInUSD = 1 / targetToUSDRate;

      const baseToTarget = oneBaseUnitInUSD * targetToUSDRate;
      const targetToBase = oneTargetUnitInUSD * baseToUSDRate;
      const targetResult = argument * baseToTarget;
      const baseResult = argument * targetToBase;

      const displayArgument = parseFloat(argument).toLocaleString(
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
  const details = [
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

  const localDataInfo = getLocalDataInfo(); // [dataDate, apiUsageStats]

  const info = {
    title: 'Refresh'.localize(),
    icon: 'refreshTemplate',
    action: 'refreshAlert',
    actionArgument: dict.argument,
  };

  if (localDataInfo != undefined) {
    if (localDataInfo[0] != undefined) {
      info.subtitle = 'Last update: '.localize() + localDataInfo[0];
      info.alwaysShowsSubtitle = true;
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

  const url = `https://www.google.com/finance/quote/${dict.base}-${dict.target}?window=1M`;

  LaunchBar.hide();
  LaunchBar.openURL(url);
}

// SETTING FUNCTIONS

function settings() {
  const base = Action.preferences.base;
  baseSetting = {
    title: 'Choose base currency'.localize(),
    icon: 'settings',
    badge: base ? base : 'USD',
    action: 'baseCurrencyList',
  };

  const setAPISetting = {
    title: 'Set App ID'.localize(),
    icon: 'keyTemplate',
    action: 'setAppID',
  };

  const settingItems = [targetsSetting, baseSetting, setAPISetting];

  const localDataInfo = getLocalDataInfo();

  const info = {
    title: 'Manual data refresh'.localize(),
    icon: 'refreshTemplate',
    action: 'refreshAlert',
    actionArgument: 'settings',
  };

  if (localDataInfo[0] != undefined) {
    info.subtitle = 'Last update: '.localize() + localDataInfo[0];
    info.alwaysShowsSubtitle = true;

    if (localDataInfo[1] != undefined) {
      info.subtitle = info.subtitle + localDataInfo[1];
    }
  }
  settingItems.push(info);

  return settingItems;
}

function baseCurrencyList() {
  const base = Action.preferences.base ?? 'USD';

  let other = [];
  let currentBase = [];

  for (const i in currencyList) {
    const pushData = {
      title: currencyList[i],
      icon: 'circleTemplate',
      badge: i,
      action: 'setBase',
      actionArgument: i,
    };

    if (i == base) {
      pushData.label = 'base currency'.localize();
      pushData.icon = 'checkTemplate';
      currentBase.push(pushData);
    } else {
      other.push(pushData);
    }
  }

  return [...currentBase, ...other];
}

function targetCurrencyList() {
  let other = [];
  let favs = [];

  for (const i in currencyList) {
    const pushData = {
      title: currencyList[i],
      icon: 'circleTemplate',
      badge: i,
      action: 'setTarget',
      actionArgument: i,
    };

    if (targetCurrencies.includes(i)) {
      pushData.label = 'target currency'.localize();
      pushData.icon = 'checkTemplate';
      pushData.action = 'removeTarget';
      favs.push(pushData);
    } else {
      other.push(pushData);
    }
  }

  return [...favs, ...other];
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
  targetCurrencies = targetCurrencies.filter((item) => item !== symbol);
  Action.preferences.targetCurrencies = targetCurrencies;
  return targetCurrencyList();
}

function getLocalDataInfo() {
  let ratesData, dataDate;
  if (File.exists(ratesDataPath)) {
    ratesData = File.readJSON(ratesDataPath);
    if (ratesData == undefined || ratesData.response == undefined) {
      return;
    }

    if (ratesData.response.status == 200) {
      dataDate = LaunchBar.formatDate(
        new Date(ratesData.data.timestamp * 1000),
        {
          relativeDateFormatting: true,
          timeStyle: 'long',
          dateStyle: 'short',
        }
      );
    }
  }
  return [dataDate];
}

function refreshAlert(arg) {
  let alertTitle = 'Confirm to refresh!'.localize();
  const difference = compareDates();

  // Check if a new API call is needed
  if (difference != undefined && difference < 3600) {
    // If less than 1 hour has passed there is no need to make a new API call unless the user is on a paid plan.
    alertTitle +=
      '\nYour local data has already been updated within the last hour.'.localize();
  }

  const response = LaunchBar.alert(
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
  let makeAPICall = true;
  let ratesData;

  // Check if a new API call is needed
  const difference = compareDates();
  if (difference && difference < 7200) {
    // If less than 2 hours have passed since the time the exchange rate information that is stored locally was collected don't make an API call.  You can change this number to make more or less calls.
    makeAPICall = false;
  }

  if (makeAPICall == true) {
    ratesData = APICall();
  } else {
    if (File.exists(ratesDataPath)) {
      ratesData = File.readJSON(ratesDataPath);
    }
  }
  return ratesData;
}

function compareDates() {
  let difference;
  if (File.exists(ratesDataPath)) {
    const localRatesData = File.readJSON(ratesDataPath);
    if (localRatesData.data) {
      const localDataUnixTimestamp = localRatesData.data.timestamp;
      const nowUnixTimestamp = Math.floor(new Date().getTime() / 1000);
      difference = nowUnixTimestamp - localDataUnixTimestamp;
    }
  }
  return difference;
}

function APICall() {
  const ratesData = HTTP.getJSON(
    'https://openexchangerates.org/api/latest.json',
    {
      headerFields: {
        Authorization: 'Token ' + apiKey,
      },
    }
  );

  if (!ratesData.response) {
    LaunchBar.alert(ratesData.error);
    return;
  }

  let showAPIDialog;
  if (ratesData.response.status != 200) {
    if (ratesData.data != undefined) {
      if (ratesData.data.message != undefined) {
        if (
          ratesData.data.message == 'invalid_app_id' ||
          ratesData.data.message == 'missing_app_id'
        ) {
          showAPIDialog = true;
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
  const response = LaunchBar.alert(
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
