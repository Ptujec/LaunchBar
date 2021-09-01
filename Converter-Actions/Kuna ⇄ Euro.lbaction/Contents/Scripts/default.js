// LaunchBar Action Script
// https://exchangeratesapi.io/
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http/method-loadRequests
// http://openexchangerates.github.io/accounting.js/
// jquery - Convert String with Dot or Comma as decimal separator to number in JavaScript - Stack Overflow https://stackoverflow.com/a/29347112

const apiKey = Action.preferences.apiKey

function run(argument) {
    // Check for valid API Access Key
    if (apiKey == undefined) {
        setApiKey()
    } else {
        const exchangerate = HTTP.getJSON('http://api.exchangeratesapi.io/latest?access_key=' + apiKey + '&symbols=HRK')

        if (exchangerate.error != undefined) {
            LaunchBar.alert(exchangerate.error)
            return
        }

        if (exchangerate.data.error != undefined) {
            if (exchangerate.data.error.info.includes('You have not supplied a valid API Access Key.')) {
                LaunchBar.alert(exchangerate.data.error.info)
                setApiKey()
            } else {
                LaunchBar.alert('Unable to load results', exchangerate.data.error.info);
            }

            // Main action
        } else if (exchangerate.data != undefined) {
            argument = argument.toString().replace(/[^0-9.,]*/g, '')

            var result = argument.replace(/[^0-9]/g, '');
            if (/[,\.]\d{2}$/.test(argument)) {
                result = result.replace(/(\d{2})$/, '.$1');
            }

            argument = result
            number = argument.replace('.', ',')

            var kunaRate = exchangerate.data.rates.HRK
            var euroRate = 1 / kunaRate
            var euro = argument * euroRate
            euro = euro.toFixed(2)
            euro = euro.toString().replace('.', ',')
            var kuna = argument * kunaRate
            kuna = kuna.toFixed(2)
            kuna = kuna.toString().replace('.', ',')
            kunaRate = kunaRate.toFixed(2)
            kunaRate = kunaRate.toString().replace('.', ',')
            euroRate = euroRate.toFixed(2)
            euroRate = euroRate.toString().replace('.', ',')

            var eResult = number + ' HRK = ' + euro + ' EUR (Rate: ' + euroRate + ')'
            var dResult = number + ' EUR = ' + kuna + ' HRK (Rate: ' + kunaRate + ')'
            LaunchBar.setClipboardString(eResult + '\n' + dResult)

            return [{
                title: euro,
                subtitle: number + ' HRK (Rate: ' + euroRate + ')',
                icon: "KunaEuroTemplate",
                badge: 'EUR'
            }, {
                title: kuna,
                subtitle: number + ' EUR (Rate: ' + kunaRate + ')',
                icon: "EuroKunaTemplate",
                badge: 'HRK'
            }]

        }
    }
}

function setApiKey() {
    var response = LaunchBar.alert(
        "API Access Key required", "You can get a free API Access Key at https://exchangeratesapi.io/pricing/. Copy the key to your clipboard, run the action again and choose »Set API-Token«", "Open Website", "Set API-Token", "Cancel"
    );
    switch (response) {
        case 0:
            LaunchBar.openURL('https://exchangeratesapi.io/pricing/')
            LaunchBar.hide()
            break
        case 1:
            Action.preferences.apiKey = LaunchBar.getClipboardString().trim()
            LaunchBar.alert('Success!', 'API Access Key set to: ' + Action.preferences.apiKey)
            break
        case 2:
            break
    }
}