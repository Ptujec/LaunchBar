/* 
Dollar to EUR Action for LaunchBar
by Christian Bender (@ptujec)
2023-04-02

Documentation
- https://exchangeratesapi.io/documentation/
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http/

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const apiKey = Action.preferences.apiKey;
const localDataPath = Action.supportPath + '/localData.json';
const todayDate = new Date().toISOString().split('T')[0];

function run(argument) {
  // Check for valid API Access Key
  if (apiKey == undefined) {
    setApiKey();
    return;
  }

  // Check stored rates are from today to see if a new API call is needed
  var makeAPICall = true;

  if (File.exists(localDataPath)) {
    var localData = File.readJSON(localDataPath);
    if (localData.data != undefined) {
      var rateInfoDate = localData.data.date;

      if (todayDate == rateInfoDate) {
        makeAPICall = false;
      }
    }
  }

  if (makeAPICall == true) {
    var ratesData = HTTP.getJSON(
      'http://api.exchangeratesapi.io/v1/latest?access_key=' +
        apiKey +
        '&symbols=USD'
    );

    if (ratesData.error != undefined) {
      LaunchBar.alert(ratesData.error);
      return;
    }

    if (ratesData.data.error != undefined) {
      var code = ratesData.data.error.code;
      var info = ratesData.data.error.info;

      if (isNaN(code)) {
        code = ratesData.response.status;
      }

      if (info == undefined) {
        info = ratesData.data.error.message;
      }

      LaunchBar.alert(code + ': ' + info);

      if (
        ratesData.data.error.code == 101 ||
        ratesData.data.error.code == 'invalid_access_key'
      ) {
        Action.preferences.apiKey = undefined;
      }
      return;
    }

    // Store data to reduce API calls
    File.writeJSON(ratesData, localDataPath);
  } else {
    var ratesData = localData;
  }

  if (ratesData.response == undefined) {
    return;
  }

  argument = argument.toString().replace(/[^0-9.,]*/g, '');

  var result = argument.replace(/[^0-9]/g, '');

  if (/[,\.]\d{2}$/.test(argument)) {
    result = result.replace(/(\d{2})$/, '.$1');
  }

  argument = result;
  number = argument.replace('.', ',');

  var dollarRate = ratesData.data.rates.USD;
  var euroRate = 1 / dollarRate;
  var euro = argument * euroRate;
  euro = euro.toFixed(2).toString().replace('.', ',');
  var dollar = argument * dollarRate;
  dollar = dollar.toFixed(2).toString().replace('.', ',');
  dollarRate = dollarRate.toFixed(2).toString().replace('.', ',');
  euroRate = euroRate.toFixed(2).toString().replace('.', ',');

  var eResult = number + ' USD = ' + euro + ' EUR (Rate: ' + euroRate + ')';
  var dResult = number + ' EUR = ' + dollar + ' USD (Rate: ' + dollarRate + ')';

  LaunchBar.setClipboardString(eResult + '\n' + dResult);

  return [
    {
      title: euro,
      subtitle: number + ' USD (Rate: ' + euroRate + ')',
      icon: 'DollarEuroTemplate',
      badge: 'EUR',
    },
    {
      title: dollar,
      subtitle: number + ' EUR (Rate: ' + dollarRate + ')',
      icon: 'EuroDollarTemplate',
      badge: 'USD',
    },
  ];
}

function setApiKey() {
  var response = LaunchBar.alert(
    'API Access Key required',
    'You can get a free API Access Key at https://exchangeratesapi.io/pricing/. Copy the key to your clipboard, run the action again and choose »Set API-Token«',
    'Open Website',
    'Set API-Token',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.openURL('https://manage.exchangeratesapi.io/dashboard');
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
