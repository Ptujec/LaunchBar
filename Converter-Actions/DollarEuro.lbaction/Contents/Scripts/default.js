// LaunchBar Action Script
// https://exchangeratesapi.io/
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http/method-loadRequests
// http://openexchangerates.github.io/accounting.js/
// jquery - Convert String with Dot or Comma as decimal separator to number in JavaScript - Stack Overflow https://stackoverflow.com/a/29347112

const apiKey = '123' // Replace 123 with your API Key in default.js (in LaunchBars Acticon Editor). You can get an API Key for free at https://exchangeratesapi.io/pricing/
const exchangerate = HTTP.getJSON('http://api.exchangeratesapi.io/latest?access_key=' + apiKey + '&symbols=USD')

function run(argument) {
    if (apiKey == '123') {
        LaunchBar.alert('Replace 123 with your API Key in default.js (in LaunchBars Acticon Editor). You can get an API Key for free at https://exchangeratesapi.io/pricing/')
    }

    if (exchangerate.data.error != undefined) {
        LaunchBar.alert('Unable to load results', exchangerate.data.error.info);
    } else if (exchangerate.data != undefined) {
        argument = argument.toString().replace(/[^0-9.,]*/g, '')

        var result = argument.replace(/[^0-9]/g, '');
        if (/[,\.]\d{2}$/.test(argument)) {
            result = result.replace(/(\d{2})$/, '.$1');
        }

        argument = result
        number = argument.replace('.', ',')

        var dollarRate = exchangerate.data.rates.USD
        var euroRate = 1 / dollarRate
        var euro = argument * euroRate
        euro = euro.toFixed(2)
        euro = euro.toString().replace('.', ',')
        var dollar = argument * dollarRate
        dollar = dollar.toFixed(2)
        dollar = dollar.toString().replace('.', ',')
        dollarRate = dollarRate.toFixed(2)
        dollarRate = dollarRate.toString().replace('.', ',')
        euroRate = euroRate.toFixed(2)
        euroRate = euroRate.toString().replace('.', ',')

        var eResult = number + ' USD = ' + euro + ' EUR (Rate: ' + euroRate + ')'
        var dResult = number + ' EUR = ' + dollar + ' USD (Rate: ' + dollarRate + ')'
        LaunchBar.setClipboardString(eResult + '\n' + dResult)

        return [{
            title: euro,
            subtitle: number + ' USD (Rate: ' + euroRate + ')',
            icon: "DollarEuroTemplate",
            badge: 'EUR'
        }, {
            title: dollar,
            subtitle: number + ' EUR (Rate: ' + dollarRate + ')',
            icon: "EuroDollarTemplate",
            badge: 'USD'
        }]

    }
}