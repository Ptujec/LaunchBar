// LaunchBar Action Script

function runWithString(string) {
    if (Action.preferences.budgetCurrencySymbol == '€') {
        var icon = 'euroTemplate'
        var sep = ','
    } else {
        var sep = '.'
        var icon = 'dollarTemplate'
    }

    var title = ''

    if (string.startsWith('+')) {
        var income = true
        string = string.replace(/\+/, '')
    } else {
        var income = false
        string = string.replace(/\-/, '')
    }

    if (string != '' && string != '$' && string != '€') {

        // Sort out currency symbols or other text (including "-" because this is assumed) 

        if (string.includes(',') || string.includes('.')) {
            string = string
                .replace(/[^\d,.+]/g, '')
                .trim()

            var testDecimal = string.match(/(?:,|\.)(\d*)/)

            if (string.startsWith(',')) {
                string = '0' + string
            }

            if (testDecimal[1].length == 1) {
                title = string + '0'
            } else if (testDecimal[1].length < 1) {
                title = string + '00'
            } else {
                title = string
            }
        } else {
            string = string
                .replace(/[^\d,.+€\$]/g, '')
                .trim()

            if (string.includes('€') || string.includes('$')) {
                string = string
                    .replace(/€|\$/g, '')
                    .trim()

                if (string != '') {
                    title = string + sep + '00'
                }

            } else {
                if (string.length < 2) {
                    title = '0' + sep + '0' + string
                } else if (string.length < 3) {
                    title = '0' + sep + string
                } else {
                    title = string.replace(/(\d+?)?(\d\d$)/, '$1' + sep + '$2')
                }
            }
        }

        if (income == true) {
            title = '+' + title
        } else {
            title = '-' + title
        }

        return [
            {
                'title': title,
                'icon': icon
            }
        ]
    }
}