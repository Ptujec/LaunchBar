/* YNAB - Add Transactions by Christian Bender (@Ptujec) 2021
https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
https://api.youneedabudget.com/v1
*/

const token = Action.preferences.accessToken
const budgetID = Action.preferences.budgetID

// Check token, budget ID, entry, set amount and show payees 
function run(argument) {
    if (argument == undefined) {
        if (token == undefined) {
            setToken()
        } else {
            return [
                {
                    title: "Choose Budget",
                    subtitle: "Choose the budget you want to use this action for.",
                    icon: "budgetTemplate",
                    badge: "Settings",
                    action: "budgetSettings"
                },
                {
                    title: "Cleared/Uncleared",
                    subtitle: "Decide if new transactions should be automatically cleared or not.",
                    icon: "gearTemplate",
                    badge: "Settings",
                    action: "clearedSettings"
                },
                {
                    title: "Pin Category",
                    subtitle: "Pick a category you want to show on top.",
                    icon: "pinTemplate",
                    badge: "Settings",
                    action: "pinCategory"
                },
                {
                    title: "Refresh Data",
                    subtitle: "Refresh categories, payees and accounts. They are preloaded for better performance.",
                    icon: "refreshTemplate",
                    action: "dataRefresh"
                }
            ]
        }
    } else {
        if (token == undefined) {
            setToken()
        } else if (budgetID == undefined) {
            return [
                {
                    title: "Choose Budget",
                    subtitle: "Choose the budget you want to use this action for.",
                    icon: "budgetTemplate",
                    action: "budgetSettings"
                }
            ]
        } else {
            // Check if entry is valid
            var valid = (/\d/).test(argument)
            if (valid == false) {
                return [
                    {
                        'title': 'No valid entry!',
                        'icon': 'warningTemplate'
                    }
                ]
            }

            // Check if income or expense
            if (argument.startsWith('+')) {
                var income = true
                argument = argument.replace(/\+/, '')
            } else {
                var income = false
            }

            // Amount
            if (argument.includes(',') || argument.includes('.')) {
                argument = argument
                    .replace(/[^\d,.+]/g, '')
                    .trim()

                var test = argument.match(/(?:,|\.)(\d*)/)

                if (test[1].length == 1) {
                    amount = argument + '00'
                } else if (test[1].length < 1) {
                    amount = argument + '000'
                } else {
                    amount = argument + '0'
                }
                amount = amount
                    .replace(/,|\./, '')
            } else {
                argument = argument
                    .replace(/[^\d,.+€\$]/g, '')
                    .trim()

                if (argument.includes('€') || argument.includes('$')) {
                    argument = argument
                        .replace(/€|\$/g, '')
                        .trim()

                    if (argument != '') {
                        amount = argument + '000'
                    } else {
                        return [
                            {
                                'title': 'No valid amount',
                                'icon': 'warningTemplate'
                            }
                        ]
                    }

                } else {
                    amount = argument + '0'
                }
            }

            if (income == false) {
                amount = '-' + amount
            }

            Action.preferences.recentAmount = parseInt(amount)

            // Payee 
            try {
                // var yData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/payees?access_token=' + token, 3)
                // yData = yData.data
                var yData = File.readJSON('~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/payees.json');
            } catch (exception) {
                LaunchBar.alert('Error while reading JSON: ' + exception);
            }

            var payees = yData.data.payees
            var p = [];

            for (var i = 0; i < payees.length; i++) {
                var pName = payees[i].name;
                var pId = payees[i].id;

                if (pName.includes('Transfer')) {
                    var icon = 'transferTemplate'
                } else {
                    var icon = 'payeeTemplate'
                }

                p.push({
                    'title': pName,
                    'icon': icon,
                    'action': "setPayeeAndContinue",
                    'actionArgument': pName + '\n' + pId
                });
            }

            p.sort(function (a, b) {
                return a.title > b.title;
            });

            var newPayee = [{
                'title': 'New Payee',
                'icon': 'newTemplate.png',
                'action': "setPayeeAndContinue",
                'actionArgument': 'Enter New Payee'
            }]
            var pResults = newPayee.concat(p)
            return pResults;
        }
    }
}
// Set payee and show categories
function setPayeeAndContinue(p) {

    p = p.split('\n')
    var pName = p[0]
    var pId = p[1]


    if (pName == 'Enter New Payee') {
        pName = LaunchBar.executeAppleScript(
            'set result to display dialog "Payee" with title "Payee" default answer ""',
            'set result to text returned of result')
            .trim()
        LaunchBar.hide()

        if (pName == '') {
            return
        }
        Action.preferences.updatePayees = true
    } else {
        Action.preferences.updatePayees = false
    }

    Action.preferences.recentPayeeName = pName
    Action.preferences.recentPayeeId = pId

    // Category
    try {
        var cData = File.readJSON('~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/categories.json');
        // Use object
    } catch (exception) {
        LaunchBar.alert('Error while reading JSON: ' + exception);
    }

    var cGroups = cData.data.category_groups
    cGroups = cGroups.filter(function (el) {
        return el.name != 'Hidden Categories';
    });

    var internalCategories = [];
    var userCategories = [];
    var i1 = 0;
    for (i1 = 0; i1 < cGroups.length; i1++) {

        var categories = cGroups[i1].categories
        var i2 = 0;
        for (i2 = 0; i2 < categories.length; i2++) {
            if (cGroups[i1].name == 'Internal Master Category') {
                if (categories[i2].name != Action.preferences.pinnedCategory[0].title) {
                    internalCategories.push({
                        'title': categories[i2].name,
                        'subtitle': cGroups[i1].name,
                        'icon': 'categoryTemplate.png',
                        'action': "setCategoryAndContinue",
                        'actionArgument': categories[i2].id
                    });
                }
            } else {
                if (categories[i2].name != Action.preferences.pinnedCategory[0].title) {
                    userCategories.push({
                        'title': categories[i2].name,
                        'subtitle': cGroups[i1].name,
                        'icon': 'categoryTemplate.png',
                        'action': "setCategoryAndContinue",
                        'actionArgument': categories[i2].id
                    });
                }
            }
        }
    }

    var c = userCategories.concat(internalCategories)
    var pinnedCategory = Action.preferences.pinnedCategory

    if (pinnedCategory != undefined) {
        var results = pinnedCategory.concat(c)
        return results;
    } else {
        return c
    }
}
// Set category and show accounts
function setCategoryAndContinue(c) {
    Action.preferences.recentCategory = c

    // Accounts 
    try {
        // var aData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/accounts?access_token=' + token, 3)
        // aData = aData.data
        var aData = File.readJSON('~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/accounts.json');
    } catch (exception) {
        LaunchBar.alert('Error while reading JSON: ' + exception);
    }

    var accounts = aData.data.accounts
    var a = [];

    for (var i = 0; i < accounts.length; i++) {

        if (accounts[i].closed == false) {

            if (accounts[i].type == 'cash') {
                var icon = 'cashTemplate.png'
            } else if (accounts[i].type == 'otherAsset') {
                var icon = 'trackingAccountTemplate.png'
            } else {
                var icon = 'accountTemplate.png'
            }

            a.push({
                'title': accounts[i].name,
                'icon': icon,
                'action': "setAccountAndContinue",
                'actionArgument':
                    accounts[i].id
                    + '\n'
                    + accounts[i].type
                    + '\n'
                    + icon
            });
        }
    }
    return a;
}
// Set account and show date options
function setAccountAndContinue(a) {
    a = a.split('\n')
    Action.preferences.recentAccountID = a[0]
    Action.preferences.recentAccountType = a[1]
    Action.preferences.recentAccountIcon = a[2]

    // Dates
    var dates = []
    for (var i = 0; i > -180; i--) {

        var date = new Date();

        // Add or subtrackt days
        var offsetNumber = i
        date.setDate(date.getDate() + offsetNumber);

        var dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0]

        dates.push({
            'title': dateString,
            'icon': 'calTemplate',
            'action': 'setDateAndContinue',
            'actionArgument': dateString
        })
    }
    return dates
}
// Set date and show memo dialog
function setDateAndContinue(d) {
    Action.preferences.recentDate = d

    // Check for Mail URL and show memo dialog
    var result = LaunchBar.executeAppleScriptFile('./mail.applescript')
        .trim()
        .split('\n')


    if (result != '') {
        var title = result[1]
            .replace(/fwd: |aw: |wtr: |re: |fw: /gi, '')

        Action.preferences.tempMailSubject = title

        var link = result[0]

        return [
            {
                'title': 'No Memo',
                'icon': 'noTemplate.png',
                'action': "setMemoAndComplete",
                'actionArgument': 'No Memo'
            },
            {
                'title': "Link to Email: " + title,
                'icon': 'linkTemplate.png',
                'action': "setMemoAndComplete",
                'actionArgument': link
            },
            {
                'title': 'Add Memo',
                'icon': 'newTemplate.png',
                'action': "setMemoAndComplete",
                'actionArgument': 'Add Memo'
            }
        ]
    } else {
        return [
            {
                'title': 'No Memo',
                'icon': 'noTemplate.png',
                'action': "setMemoAndComplete",
                'actionArgument': 'No Memo'
            },
            {
                'title': 'Add Memo',
                'icon': 'newTemplate.png',
                'action': "setMemoAndComplete",
                'actionArgument': 'Add Memo'
            }
        ]
    }
}
// Set memo, create transaction and show response
function setMemoAndComplete(m) {
    // Memo
    if (m == 'No Memo') {
        Action.preferences.recentMemo = ''
    } else if (m == 'Add Memo') {
        var memo = LaunchBar.executeAppleScript(
            'set result to display dialog "Memo" with title "Memo" default answer ""',
            'set result to text returned of result')
            .trim()

        LaunchBar.hide()

        if (memo == '') {
            return
        }

        Action.preferences.recentMemo = memo
        Action.preferences.recentMemoIcon = 'memoTemplate'
    } else {
        Action.preferences.recentMemo = Action.preferences.tempMailSubject + ' ' + m
        Action.preferences.recentMemoIcon = 'linkTemplate'
    }

    // Cleared Settings
    if (Action.preferences.recentAccountType == 'otherAsset') {
        var cleared = Action.preferences.clearedSettingsOtherAsset
    } else if (Action.preferences.recentAccountType == 'checking') {
        var cleared = Action.preferences.clearedSettingsChecking
    } else if (Action.preferences.recentAccountType == 'cash') {
        var cleared = Action.preferences.clearedSettingsCash
    }

    if (cleared == undefined) {
        if (Action.preferences.recentAccountType == 'cash') {
            cleared = 'cleared'
        } else {
            cleared = 'uncleared'
        }
    }

    // Add Transaction
    var tResult = HTTP.postJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/transactions?access_token=' + token, {
        body: {
            "transaction": {
                "account_id": Action.preferences.recentAccountID,
                "date": Action.preferences.recentDate,
                "amount": Action.preferences.recentAmount,
                "payee_id": Action.preferences.recentPayeeId,
                "payee_name": Action.preferences.recentPayeeName,
                "category_id": Action.preferences.recentCategory,
                "memo": Action.preferences.recentMemo,
                "cleared": cleared,
                "approved": true,
                "flag_color": null,
                "import_id": null,
                "subtransactions": []
            }
        }
    });

    if (tResult.data == undefined) {
        // Check internet connection
        var output = LaunchBar.execute("/sbin/ping", "-o", "www.youneedabudget.com");
        if (output == "") {
            LaunchBar.alert("You seem to have no internet connection!");
            return;
        }
    } else {

        
        // Evaluate result
        tResult = eval('[' + tResult.data + ']')
        
        if (tResult[0].error != undefined) {
            LaunchBar.alert(tResult[0].error.id + ' ' + tResult[0].error.name + ': ' + tResult[0].error.detail)
            return 
        }

        var tData = tResult[0].data.transaction
        var tAmount = tData.amount / 1000
        tAmount = tAmount.toFixed(2).toString()
        var tCleared = tData.cleared

        if (tCleared == 'uncleared') {
            var tSub = 'Amount (uncleared)'
        } else {
            var tSub = 'Amount'
        }

        var tDate = tData.date
        var tPayee = tData.payee_name
        var tCat = tData.category_name
        var tAcc = tData.account_name
        var tMemo = tData.memo
        var link = 'https://app.youneedabudget.com/' + budgetID + '/accounts'

        if (tMemo != null && tMemo.includes('message://')) {
            link = tMemo.match(/(message:\S*)/).toString()
        }

        if (tPayee.includes('Transfer')) {
            var pIcon = 'transferInTemplate'
            var aIcon = 'transferOutTemplate'
        } else {
            var pIcon = 'payeeTemplate'
            var aIcon = Action.preferences.recentAccountIcon
        }

        if (Action.preferences.budgetCurrencySymbol == '€') {
            var cIcon = 'euroTemplate'
            tAmount = tAmount.replace(/\./, ',') + ' ' + Action.preferences.budgetCurrencySymbol
        } else {
            var cIcon = 'dollarTemplate'
            tAmount = tAmount.replace(/-/, '')
            tAmount = '-' + Action.preferences.budgetCurrencySymbol + tAmount
        }

        // Refresh Payees (if a new one was added)
        if (Action.preferences.updatePayees == true) {
            var pData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/payees?access_token=' + token, 3)

            File.writeJSON(pData.data, '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/payees.json');
        }

        // Show Result
        if (tMemo == '') {
            return [{
                title: tAmount,
                subtitle: tSub,
                icon: cIcon,
                url: link
            }, {
                title: tDate,
                subtitle: 'Date',
                icon: 'calTemplate',
                url: link
            }, {
                title: tPayee,
                subtitle: 'Payee',
                icon: pIcon,
                url: link
            }, {
                title: tCat,
                subtitle: 'Category',
                icon: 'categoryTemplate',
                url: link
            }, {
                title: tAcc,
                subtitle: 'Account',
                icon: aIcon,
                url: link
            }]
        } else {
            return [{
                title: tAmount,
                subtitle: tSub,
                icon: cIcon,
                url: link
            }, {
                title: tDate,
                subtitle: 'Date',
                icon: 'calTemplate',
                url: link
            }, {
                title: tPayee,
                subtitle: 'Payee',
                icon: pIcon,
                url: link
            }, {
                title: tCat,
                subtitle: 'Category',
                icon: 'categoryTemplate',
                url: link
            }, {
                title: tAcc,
                subtitle: 'Account',
                icon: aIcon,
                url: link
            }, {
                title: tMemo,
                subtitle: 'Memo',
                icon: Action.preferences.recentMemoIcon,
                url: link
            }]
        }
    }
}

// Setting Functions
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
                'badge': 'Budget Setting',
                'actionArgument': bId
            })
        }
        return results;
    }
}
function setBudgetID(bId) {
    // Set Budget ID
    Action.preferences.budgetID = bId

    // Preload data
    LaunchBar.hide()

    var bData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + bId + '/settings/?access_token=' + token)
    var pData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + bId + '/payees?access_token=' + token, 3)
    var cData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + bId + '/categories?access_token=' + token, 3)
    var aData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + bId + '/accounts?access_token=' + token, 3)

    Action.preferences.budgetCurrencySymbol = bData.data.data.settings.currency_format.currency_symbol
    File.writeJSON(cData.data, '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/categories.json');
    File.writeJSON(pData.data, '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/payees.json');
    File.writeJSON(aData.data, '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/accounts.json');

    return [{
        title: "Buget set!",
        icon: "checkTemplate"
    }];
}
function clearedSettings() {
    if (Action.preferences.clearedSettingsOtherAsset == undefined) {
        var oA = 'uncleared'
        var oSub = 'Hit return to change!'
    } else {
        var oA = Action.preferences.clearedSettingsOtherAsset
        var oSub = 'Hit return to change! (default: uncleared)'
    }

    if (Action.preferences.clearedSettingsCash == undefined) {
        var cash = 'cleared'
        var cashSub = 'Hit return to change!'
    } else {
        var cash = Action.preferences.clearedSettingsCash
        var cashSub = 'Hit return to change! (default: cleared)'
    }

    if (Action.preferences.clearedSettingsChecking == undefined) {
        var checking = 'uncleared'
        var checkingSub = 'Hit return to change!'
    } else {
        var checking = Action.preferences.clearedSettingsChecking
        var checkingSub = 'Hit return to change! (default: uncleared)'
    }

    return [
        {
            'title': 'Cash: ' + cash,
            'subtitle': cashSub,
            'icon': 'cashTemplate',
            'badge': 'Cleared/Uncleared Setting',
            'action': 'clearedUncleared',
            'actionArgument': 'cash'
        },
        {
            'title': 'Checking: ' + checking,
            'subtitle': checkingSub,
            'icon': 'accountTemplate',
            'badge': 'Cleared/Uncleared Setting',
            'action': 'clearedUncleared',
            'actionArgument': 'checking'
        },
        {
            'title': 'Other Asset: ' + oA,
            'subtitle': oSub,
            'icon': 'trackingAccountTemplate',
            'badge': 'Cleared/Uncleared Setting',
            'action': 'clearedUncleared',
            'actionArgument': 'otherAsset'
        },
        {
            'title': 'Mark all new transactions as "uncleared"',
            'icon': 'unclearedTemplate',
            'badge': 'Cleared/Uncleared Setting',
            'action': 'setClearedSetting',
            'actionArgument': 'uncleared'
        },
        {
            'title': 'Mark all new transactions as "cleared"',
            'icon': 'clearedTemplate',
            'badge': 'Cleared/Uncleared Setting',
            'action': 'setClearedSetting',
            'actionArgument': 'cleared'
        }
    ]
}
function clearedUncleared(aType) {

    return [
        {
            'title': 'Mark all new ' + aType + ' transactions as "uncleared"',
            'icon': 'unclearedTemplate',
            'badge': 'Cleared/Uncleared Setting',
            'action': 'setClearedSetting',
            'actionArgument': 'uncleared\n' + aType
        },
        {
            'title': 'Mark all new ' + aType + ' transactions as "cleared"',
            'icon': 'clearedTemplate',
            'badge': 'Cleared/Uncleared Setting',
            'action': 'setClearedSetting',
            'actionArgument': 'cleared\n' + aType
        }
    ]
}
function setClearedSetting(cInfo) {
    r = cInfo.split('\n')
    cState = r[0]
    aType = r[1]

    if (aType == undefined) {
        Action.preferences.clearedSettingsOtherAsset = cState
        Action.preferences.clearedSettingsCash = cState
        Action.preferences.clearedSettingsChecking = cState
    } else if (aType == 'otherAsset') {
        Action.preferences.clearedSettingsOtherAsset = cState
    } else if (aType == 'cash') {
        Action.preferences.clearedSettingsCash = cState
    } else if (aType == 'checking') {
        Action.preferences.clearedSettingsChecking = cState
    }
}

function pinCategory() {
    // Category
    try {
        var cData = File.readJSON('~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/categories.json');
        // Use object
    } catch (exception) {
        LaunchBar.alert('Error while reading JSON: ' + exception);
    }

    var cGroups = cData.data.category_groups
    cGroups = cGroups.filter(function (el) {
        return el.name != 'Hidden Categories';
    });

    var internalCategories = [];
    var userCategories = [];
    var i1 = 0;
    for (i1 = 0; i1 < cGroups.length; i1++) {
        var categories = cGroups[i1].categories
        var i2 = 0;
        for (i2 = 0; i2 < categories.length; i2++) {
            if (cGroups[i1].name == 'Internal Master Category') {
                if (categories[i2].name != Action.preferences.pinnedCategory[0].title) {
                    internalCategories.push({
                        'title': categories[i2].name,
                        'subtitle': cGroups[i1].name,
                        'icon': 'categoryTemplate.png',
                        'badge': 'Pin Category Setting',
                        'action': "setPin",
                        'actionArgument': categories[i2].name + '\n' + cGroups[i1].name + '\n' + categories[i2].id
                    });
                }
            } else {
                if (categories[i2].name != Action.preferences.pinnedCategory[0].title) {
                    userCategories.push({
                        'title': categories[i2].name,
                        'subtitle': cGroups[i1].name,
                        'icon': 'categoryTemplate.png',
                        'badge': 'Pin Category Setting',
                        'action': "setPin",
                        'actionArgument': categories[i2].name + '\n' + cGroups[i1].name + '\n' + categories[i2].id
                    });
                }
            }
        }
    }
    var pin = userCategories.concat(internalCategories)
    var pinnedCategory = Action.preferences.pinnedCategory

    if (pinnedCategory != undefined) {
        var results = pinnedCategory.concat(pin)
        return results;
    } else {
        return pin
    }

}
function setPin(pin) {
    pin = pin.split('\n')
    pinTitle = pin[0]
    pinSubtitle = pin[1]
    pinID = pin[2]

    var pinnedCategory = [{
        'title': pinTitle,
        'subtitle': pinSubtitle,
        'icon': 'categoryTemplate.png',
        'badge': 'Pinned',
        'action': "setCategoryAndContinue",
        'actionArgument': pinID
    }]

    Action.preferences.pinnedCategory = pinnedCategory

    return [{
        'title': 'Pinned!',
        'icon': 'checkTemplate.png',
    }]
}
function dataRefresh() {
    // Preload data
    LaunchBar.hide()

    var pData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/payees?access_token=' + token, 3)
    var cData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/categories?access_token=' + token, 3)
    var aData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/accounts?access_token=' + token, 3)

    File.writeJSON(cData.data, '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/categories.json');
    File.writeJSON(pData.data, '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/payees.json');
    File.writeJSON(aData.data, '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.YNABAddTransaction/accounts.json');

    LaunchBar.displayNotification({
        title: 'Success!',
        subtitle: 'Your YNAB data is uptodate again!'
    });
}