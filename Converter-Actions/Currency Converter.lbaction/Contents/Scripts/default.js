/* 
Currency Converter Action for LaunchBar
by Christian Bender (@ptujec)
2023-04-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation
- https://apilayer.com/marketplace/exchangerates_data-api
- https://develop er.obdev.at/launchbar-developer-documentation/#/javascript-http/ 

Potential Features:
- Group seperators
- Copy Results automatically to the clipboard (including rate and such)
- Show results in detailed view on enter
*/

include('global.js');
include('settings.js');

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
    // return [favsSetting];
    return [favsSetting, baseSetting];
  }

  if (targetCurrencies == base) {
    return [baseSetting, favsSetting];
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
        ' is ' +
        targetResult +
        ' ' +
        targetCurrency +
        ' (Rate: ' +
        baseToTarget.toFixed(2) +
        ')';

      var subBaseResult =
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

      result.push(
        {
          title: targetResult,
          subtitle: subTargetResult,
          icon: 'result',
          badge: base + ' → ' + targetCurrency,
          action: 'showDetails',
          actionArgument: {
            result: targetResult,
            currencyTitle: targetCurrency,
            rate: baseToTarget.toFixed(2).toString(),
            argument: argument.toString(),
            currencyBadge: base,
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
            currencyTitle: base,
            rate: targetToBase.toFixed(2).toString(),
            argument: argument.toString(),
            currencyBadge: targetCurrency,
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
      badge: dict.currencyTitle,
      icon: 'result',
    },
    {
      title: dict.argument,
      badge: dict.currencyBadge,
      icon: 'from',
    },
    {
      title: dict.rate,
      badge: 'Rate',
      icon: 'rate',
    },
  ];

  if (dict.usesCommaSeparator == true) {
    details.forEach(function (item) {
      item.title = item.title.replace(/\./g, ',');
    });
  }

  return details;
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
