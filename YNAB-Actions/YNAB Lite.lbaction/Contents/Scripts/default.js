// YNAB Lite by Christian Bender (@Ptujec)
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
// https://api.youneedabudget.com

const token = Action.preferences.accessToken
const budgetID = Action.preferences.budgetID

function run() {

    if (token == undefined) {
        setToken()
    } else if (budgetID == undefined) {
        return [
            {
                title: "Budget Settings",
                subtitle: "Pick the budget you want to use this action for.",
                icon: "gearTemplate",
                action: "budgetSettings"
            }
        ]
    } else {
        if (LaunchBar.options.alternateKey) {
            // Settings
            return [
                {
                    title: "Budget Settings",
                    subtitle: "Pick the budget you want to use this action for.",
                    icon: "gearTemplate",
                    action: "budgetSettings"
                },
                {
                    title: "Days Settings",
                    subtitle: "Pick how many days you want to show transactions for",
                    icon: "gearTemplate",
                    action: "daysSettings"
                }
            ]
        } else {
            // Check if the token and the budget ID are valid 
            var check = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/settings/?access_token=' + token)

            if (check.data == undefined) {
                // Check internet connection
                var output = LaunchBar.execute("/sbin/ping", "-o", "www.youneedabudget.com");
                if (output == "") {
                    LaunchBar.alert("You seem to have no internet connection!");
                    return;
                }
            } else if (check.data.error != undefined) {
                if (check.data.error.id == '401') {
                    setToken()
                } else if (check.data.error.id == '404.2') {
                    LaunchBar.alert('Error ' + check.data.error.id + ': ' + check.data.error.name, 'Something seems to be wrong with your selected budget ID. Try to set the budget again.')

                    return [
                        {
                            title: "Budget Settings",
                            subtitle: "Pick the budget you want to use this action for.",
                            icon: "gearTemplate",
                            action: "budgetSettings"
                        }
                    ]
                } else {
                    LaunchBar.alert('Error ' + check.data.error.id + ': ' + check.data.error.name)
                }
            } else {
                // Main action
                if (LaunchBar.options.commandKey) {
                    // Open YNAB
                    LaunchBar.openURL('https://app.youneedabudget.com/')
                } else {
                    // Period to look for transactions (default: 10 days)
                    if (Action.preferences.days == undefined) {
                        Action.preferences.days = 10
                    }

                    var days = Action.preferences.days
                    var date = new Date();
                    var offsetNumber = - days;
                    date.setDate(date.getDate() + offsetNumber);
                    var startDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0]

                    var yData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/transactions?since_date=' + startDate + '&access_token=' + token)

                    // Transaction data display
                    var tData = yData.data.data.transactions.reverse()

                    var results = [];
                    var i = 0;
                    for (i = 0; i < tData.length; i++) {
                        var transaction = tData[i]
                        var payee = transaction.payee_name;
                        var tDate = transaction.date
                        var account = transaction.account_name
                        var memo = transaction.memo

                        var amount = transaction.amount / 1000
                        amount = amount.toFixed(2).toString().replace(/\./, ',') + '€'

                        if (amount.includes('-')) {
                            var icon = '03_cartTemplate'
                        } else {
                            var icon = '00_incomingTemplate'
                        }

                        var cleared = transaction.cleared
                        var title = payee + ': ' + amount

                        if (payee != null) {

                            if (payee.includes('Reconciliation')) {
                                icon = '00_plusminusTemplate'
                            } else if (payee.includes('Transfer')) {
                                if (amount.includes('-')) {
                                    icon = '01_transferOutTemplate'
                                } else {
                                    icon = '01_transferInTemplate'
                                }
                                title = amount
                            }

                        } else {
                            payee = 'No Payee'
                            title = amount
                        }

                        if (cleared == 'uncleared') {
                            title = title + ' (uncleared)'
                        }

                        var sub = tDate + ' (' + memo + ')'
                        if (memo == null || memo == '') {
                            sub = tDate
                        } 

                        results.push({
                            'title': title,
                            'subtitle': sub,
                            'badge': account,
                            'icon': icon,
                        });
                    }
                    results = results.sort(function (a, b) {
                        return b.subtitle.replace(/(\d+-\d+-\d\d)(?:.+)?/, '$1') > a.subtitle.replace(/(\d+-\d+-\d\d)(?:.+)?/, '$1') || a.title > b.title || a.icon > b.icon;
                    });
                }
                return results;
            }
        }

    }
}


function setToken() {
    var response = LaunchBar.alert(
        "Personal Access Token required", "You can creat your Personal Access Token at https://app.youneedabudget.com/settings/developer. Copy it to your clipboard, run the action again and choose »Set Token«", "Open Website", "Set Token", "Cancel"
    );
    switch (response) {
        case 0:
            LaunchBar.openURL('https://app.youneedabudget.com/settings/developer')
            LaunchBar.hide()
            break
        case 1:
            Action.preferences.accessToken = LaunchBar.getClipboardString().trim()
            LaunchBar.alert('Success!', 'Token set to: ' + Action.preferences.accessToken)
            break
        case 2:
            break
    }
}

function budgetSettings() {
    var bData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/?access_token=' + token)
    // var test = JSON.stringify(bData.data)
    // LaunchBar.alert(bData.data.data.budgets.length)

    if (bData.data == undefined) {
        // Check internet connection
        var output = LaunchBar.execute("/sbin/ping", "-o", "www.youneedabudget.com");
        if (output == "") {
            LaunchBar.alert("You seem to have no internet connection!");
            return;
        }
    } else {
        var results = [];
        for (var i = 0; i < bData.data.data.budgets.length; i++) {
            var bName = bData.data.data.budgets[i].name
            var bId = bData.data.data.budgets[i].id

            results.push({
                'title': bName,
                'icon': 'budgetTemplate',
                'action': 'setBudgetID',
                'actionArgument': bId
            })
        }
        return results;
    }
}

function setBudgetID(bId) {
    Action.preferences.budgetID = bId
    return [{
        title: "Buget set!",
        subtitle: "Hit return to run the main action",
        action: "run",
        icon: "checkTemplate"
    }];
}

function daysSettings(argument) {

    return [
        {
            title: "10 days (default)",
            icon: "daysTemplate",
            action: "setDays",
            actionArgument: "10",
        },
        {
            title: "1 month",
            icon: "daysTemplate",
            action: "setDays",
            actionArgument: "30"
        },
        {
            title: "2 month",
            icon: "daysTemplate",
            action: "setDays",
            actionArgument: "60"
        },
        {
            title: "3 month",
            icon: "daysTemplate",
            action: "setDays",
            actionArgument: "90"
        },
        {
            title: "6 month",
            icon: "daysTemplate",
            action: "setDays",
            actionArgument: "183"
        },
        {
            title: "1 year",
            icon: "daysTemplate",
            action: "setDays",
            actionArgument: "365"
        }
    ]
}

function setDays(days) {
    days = parseInt(days)
    Action.preferences.days = days
    return [{
        title: "Days set!",
        subtitle: "Hit return to run the main action",
        action: "run",
        icon: "checkTemplate"
    }];
}