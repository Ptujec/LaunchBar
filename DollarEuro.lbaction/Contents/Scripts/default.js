// LaunchBar Action Script
// https://exchangeratesapi.io/
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http/method-loadRequests

function run(argument) {

    var exchangerate = HTTP.getJSON('https://api.exchangeratesapi.io/latest?base=USD&symbols=EUR')

    if (exchangerate.data != undefined) {
        argument = argument.toString().replace( /[^0-9.,]*/g, '')
        argument = argument.replace(',', '.')
        number = argument.replace('.', ',')
        var euroRate = exchangerate.data.rates.EUR
        var dollarRate = 1 / euroRate
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
        return [eResult + '\n' + dResult];

    } else if (exchangerate.error != undefined) {
        LaunchBar.alert('Unable to load results', exchangerate.error);
    }
}