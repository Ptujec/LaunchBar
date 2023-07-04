/* YNAB - Add Transactions by Christian Bender (@Ptujec)
https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
https://api.youneedabudget.com/v1
*/

const token = Action.preferences.accessToken;
const budgetID = Action.preferences.budgetID;

// Check token, budget ID, entry, set amount and show payees
function run(argument) {
  if (argument == undefined) {
    if (token == undefined) {
      setToken();
    } else {
      return [
        {
          title: 'Choose Budget',
          subtitle: 'Choose the budget you want to use this action for.',
          icon: 'budgetTemplate',
          badge: 'Settings',
          action: 'budgetSettings',
          alwaysShowsSubtitle: true,
        },
        {
          title: 'Cleared/Uncleared',
          subtitle:
            'Decide if new transactions should be automatically cleared or not.',
          icon: 'gearTemplate',
          badge: 'Settings',
          action: 'clearedSettings',
          alwaysShowsSubtitle: true,
        },
        {
          title: 'Pin Category',
          subtitle: 'Pick a category you want to show on top.',
          icon: 'pinTemplate',
          badge: 'Settings',
          action: 'pinCategory',
          alwaysShowsSubtitle: true,
        },
        {
          title: 'Refresh Options',
          subtitle: 'Refresh preloaded data.',
          icon: 'refreshTemplate',
          badge: 'Settings',
          action: 'dataRefresh',
          alwaysShowsSubtitle: true,
          // actionRunsInBackground: true,
        },
      ];
    }
  } else {
    if (token == undefined) {
      setToken();
    } else if (budgetID == undefined) {
      return [
        {
          title: 'Choose Budget',
          subtitle: 'Choose the budget you want to use this action for.',
          icon: 'budgetTemplate',
          action: 'budgetSettings',
          alwaysShowsSubtitle: true,
        },
      ];
    } else {
      // Check if entry is valid
      var valid = /\d/.test(argument);
      if (valid == false) {
        return [
          {
            title: 'No valid entry!',
            icon: 'warningTemplate',
          },
        ];
      }

      // Check if income or expense
      if (argument.startsWith('+')) {
        var income = true;
        argument = argument.replace(/\+/, '');
      } else {
        var income = false;
      }

      // Amount
      if (argument.includes(',') || argument.includes('.')) {
        argument = argument.replace(/[^\d,.+]/g, '').trim();

        var test = argument.match(/(?:,|\.)(\d*)/);

        if (test[1].length == 1) {
          amount = argument + '00';
        } else if (test[1].length < 1) {
          amount = argument + '000';
        } else {
          amount = argument + '0';
        }
        amount = amount.replace(/,|\./, '');
      } else {
        argument = argument.replace(/[^\d,.+€\$]/g, '').trim();

        if (argument.includes('€') || argument.includes('$')) {
          argument = argument.replace(/€|\$/g, '').trim();

          if (argument != '') {
            amount = argument + '000';
          } else {
            return [
              {
                title: 'No valid amount',
                icon: 'warningTemplate',
              },
            ];
          }
        } else {
          amount = argument + '0';
        }
      }

      if (income == false) {
        amount = '-' + amount;
      }

      Action.preferences.recentAmount = parseInt(amount);

      // Check if local data is available
      if (!File.exists(Action.supportPath + '/' + budgetID)) {
        // Update
        LaunchBar.alert('Your data needs to be updated.');
        var output = resetData();

        if (output != 'success') {
          return;
        }
      }

      // Payee
      try {
        // var yData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/payees?access_token=' + token, 3)
        // yData = yData.data
        var yData = File.readJSON(
          Action.supportPath + '/' + budgetID + '/payees.json'
        );
      } catch (exception) {
        LaunchBar.alert('Error while reading JSON: ' + exception);
      }

      var payees = yData.data.payees;
      var p = [];

      for (var i = 0; i < payees.length; i++) {
        var pName = payees[i].name;
        var pId = payees[i].id;
        var pUsage = payees[i].usage;
        var lastUsedCategoryId = payees[i].last_used_category_id;
        var lastUsedAccountId = payees[i].last_used_account_id;

        if (pName.includes('Transfer')) {
          var icon = 'transferTemplate';
        } else {
          var icon = 'payeeTemplate';
        }

        var pPushData = {
          title: pName,
          icon: icon,
          action: 'setPayeeAndContinue',
          actionArgument: {
            pName: pName,
            pId: pId,
            pIndex: i,
            lastUsedCategoryId: lastUsedCategoryId,
            lastUsedAccountId: lastUsedAccountId,
          },
        };
        p.push(pPushData);
      }

      p.sort(function (a, b) {
        return a.title > b.title;
      });

      var newPayee = [
        {
          title: 'New Payee',
          icon: 'newTemplate.png',
          action: 'setPayeeAndContinue',
          actionArgument: {
            pName: 'Enter New Payee',
          },
        },
      ];
      var pResults = newPayee.concat(p);
      return pResults;
    }
  }
}
// Set payee and show categories
function setPayeeAndContinue(p) {
  var pName = p.pName;

  if (pName == 'Enter New Payee') {
    LaunchBar.hide();
    pName = LaunchBar.executeAppleScript(
      'set result to display dialog "Payee" with title "Payee" default answer ""',
      'set result to text returned of result'
    ).trim();

    if (pName == '') {
      return;
    }
    Action.preferences.updatePayees = true;
  } else {
    Action.preferences.updatePayees = false;
  }

  Action.preferences.recentPayeeName = pName;
  Action.preferences.recentPayeeId = p.pId;
  Action.preferences.recentPayeeIndex = p.pIndex;
  Action.preferences.recentPayeeLastUsedAccountId = p.lastUsedAccountId;

  // Category
  var pinnedCategoryPath =
    Action.supportPath + '/' + budgetID + '/pinnedCategory.json';
  if (File.exists(pinnedCategoryPath)) {
    var pinnedCategory = File.readJSON(pinnedCategoryPath);
  }

  try {
    var cData = File.readJSON(
      Action.supportPath + '/' + budgetID + '/categories.json'
    );
  } catch (exception) {
    LaunchBar.alert('Error while reading JSON: ' + exception);
  }

  var cGroups = cData.data.category_groups;
  cGroups = cGroups.filter(function (el) {
    return el.name != 'Hidden Categories';
  });

  var internalCategories = [];
  var userCategories = [];
  var categoryMatchingPayee = [];
  var i = 0;
  for (i = 0; i < cGroups.length; i++) {
    var categories = cGroups[i].categories;
    var j = 0;
    for (j = 0; j < categories.length; j++) {
      var categoryPushData = {
        title: categories[j].name,
        subtitle: cGroups[i].name,
        icon: 'categoryTemplate.png',
        action: 'setCategoryAndContinue',
        actionArgument: categories[j].id,
        alwaysShowsSubtitle: true,
      };

      if (cGroups[i].name == 'Internal Master Category') {
        if (pinnedCategory != undefined) {
          if (categories[j].name != pinnedCategory.title) {
            if (categories[j].id == p.lastUsedCategoryId) {
              categoryPushData.badge = 'Used Last Time';
              categoryMatchingPayee.push(categoryPushData);
            } else {
              internalCategories.push(categoryPushData);
            }
          }
        } else {
          if (categories[j].id == p.lastUsedCategoryId) {
            categoryPushData.badge = 'Used Last Time';
            categoryMatchingPayee.push(categoryPushData);
          } else {
            internalCategories.push(categoryPushData);
          }
        }
      } else {
        if (pinnedCategory != undefined) {
          if (categories[j].name != pinnedCategory.title) {
            if (categories[j].id == p.lastUsedCategoryId) {
              categoryPushData.badge = 'Used Last Time';
              categoryMatchingPayee.push(categoryPushData);
            } else {
              userCategories.push(categoryPushData);
            }
          }
        } else {
          if (categories[j].id == p.lastUsedCategoryId) {
            categoryPushData.badge = 'Used Last Time';
            categoryMatchingPayee.push(categoryPushData);
          } else {
            userCategories.push(categoryPushData);
          }
        }
      }
    }
  }

  // return categoryMatchingPayee;
  var allCategories = userCategories.concat(internalCategories);

  if (pinnedCategory != undefined) {
    var result = categoryMatchingPayee.concat(
      [pinnedCategory].concat(allCategories)
    );
  } else {
    var result = categoryMatchingPayee.concat(allCategories);
  }

  if (result == '') {
    var response = LaunchBar.alert(
      'No categories!',
      'Go to the YNAB.com and try editing some category name. Then update preloaded data.',
      'Open YNAB.com',
      'Update preloaded data',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.hide();
        LaunchBar.openURL(
          'https://app.youneedabudget.com/' + budgetID + '/budget'
        );
        break;
      case 1:
        updateRest();
        break;
      case 2:
        break;
    }
  } else {
    return result;
  }
}
// Set category and show accounts
function setCategoryAndContinue(c) {
  // Set Category
  Action.preferences.recentCategory = c;

  // Show Accounts
  try {
    // var aData = HTTP.getJSON('https://api.youneedabudget.com/v1/budgets/' + budgetID + '/accounts?access_token=' + token, 3)
    // aData = aData.data
    var aData = File.readJSON(
      Action.supportPath + '/' + budgetID + '/accounts.json'
    );
  } catch (exception) {
    LaunchBar.alert('Error while reading JSON: ' + exception);
  }

  var accounts = aData.data.accounts;
  var a = [];
  var accountMatchingPayee = [];

  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].closed == false) {
      if (accounts[i].type == 'cash') {
        var icon = 'cashTemplate.png';
      } else if (accounts[i].type == 'otherAsset') {
        var icon = 'trackingAccountTemplate.png';
      } else {
        var icon = 'accountTemplate.png';
      }

      var pushData = {
        title: accounts[i].name,
        icon: icon,
        action: 'setAccountAndContinue',
        actionArgument: {
          aId: accounts[i].id,
          aType: accounts[i].type,
          aIcon: icon,
        },
      };

      if (accounts[i].id == Action.preferences.recentPayeeLastUsedAccountId) {
        pushData.badge = 'Used Last Time';
        accountMatchingPayee.push(pushData);
      } else {
        a.push(pushData);
      }
    }
  }
  var result = accountMatchingPayee.concat(a);
  return result;
}
// Set account and show date options
function setAccountAndContinue(a) {
  Action.preferences.recentAccountID = a.aId;
  Action.preferences.recentAccountType = a.aType;
  Action.preferences.recentAccountIcon = a.aIcon;

  // Dates
  var dates = [];
  for (var i = 0; i > -180; i--) {
    var date = new Date();

    // Add or subtrackt days
    var offsetNumber = i;
    date.setDate(date.getDate() + offsetNumber);

    var dateString = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];

    dates.push({
      title: dateString,
      icon: 'calTemplate',
      action: 'setDateAndContinue',
      actionArgument: dateString,
    });
  }
  return dates;
}
// Set date and show memo dialog
function setDateAndContinue(d) {
  Action.preferences.recentDate = d;

  // Check for Mail URL and show memo dialog
  var result = LaunchBar.executeAppleScriptFile('./mail.applescript')
    .trim()
    .split('\n');

  if (result != '') {
    var title = result[1].replace(/fwd: |aw: |wtr: |re: |fw: /gi, '');

    Action.preferences.tempMailSubject = title;

    var link = encodeURI(decodeURI(result[0]));

    return [
      {
        title: 'No Memo',
        icon: 'noTemplate.png',
        action: 'setMemoAndComplete',
        actionArgument: 'No Memo',
      },
      {
        title: 'Link to Email: ' + title,
        icon: 'linkTemplate.png',
        action: 'setMemoAndComplete',
        actionArgument: link,
      },
      {
        title: 'Add Memo',
        icon: 'newTemplate.png',
        action: 'setMemoAndComplete',
        actionArgument: 'Add Memo',
      },
    ];
  } else {
    return [
      {
        title: 'No Memo',
        icon: 'noTemplate.png',
        action: 'setMemoAndComplete',
        actionArgument: 'No Memo',
      },
      {
        title: 'Add Memo',
        icon: 'newTemplate.png',
        action: 'setMemoAndComplete',
        actionArgument: 'Add Memo',
      },
    ];
  }
}
// Set memo, create transaction and show response
function setMemoAndComplete(m) {
  // Memo
  if (m == 'No Memo') {
    Action.preferences.recentMemo = '';
  } else if (m == 'Add Memo') {
    LaunchBar.hide();
    var memo = LaunchBar.executeAppleScript(
      'set result to display dialog "Memo" with title "Memo" default answer ""',
      'set result to text returned of result'
    ).trim();

    if (memo == '') {
      return;
    }

    Action.preferences.recentMemo = memo;
    Action.preferences.recentMemoIcon = 'memoTemplate';
  } else {
    // AppleScript Link
    // Truncate if more than 200 characters
    var subject = Action.preferences.tempMailSubject;

    var length = (subject + m).length;

    if (length > 199) {
      var difference = length - 199;
      var subjectLength = subject.length - difference - 1;
      subject = subject.substring(0, subjectLength) + '…';
    }

    Action.preferences.recentMemo = subject + ' ' + m;
    Action.preferences.recentMemoIcon = 'linkTemplate';
  }

  // LaunchBar.alert(Action.preferences.recentMemo.length);

  // return;

  // Cleared Settings
  if (Action.preferences.recentAccountType == 'otherAsset') {
    var cleared = Action.preferences.clearedSettingsOtherAsset;
  } else if (Action.preferences.recentAccountType == 'checking') {
    var cleared = Action.preferences.clearedSettingsChecking;
  } else if (Action.preferences.recentAccountType == 'cash') {
    var cleared = Action.preferences.clearedSettingsCash;
  }

  if (cleared == undefined) {
    if (Action.preferences.recentAccountType == 'cash') {
      cleared = 'cleared';
    } else {
      cleared = 'uncleared';
    }
  }

  // Add Transaction
  var tResult = HTTP.postJSON(
    'https://api.youneedabudget.com/v1/budgets/' +
      budgetID +
      '/transactions?access_token=' +
      token,
    {
      body: {
        transaction: {
          account_id: Action.preferences.recentAccountID,
          date: Action.preferences.recentDate,
          amount: Action.preferences.recentAmount,
          payee_id: Action.preferences.recentPayeeId,
          payee_name: Action.preferences.recentPayeeName,
          category_id: Action.preferences.recentCategory,
          memo: Action.preferences.recentMemo,
          cleared: cleared,
          approved: true,
          flag_color: null,
          import_id: null,
          subtransactions: [],
        },
      },
    }
  );

  if (tResult.error != undefined) {
    LaunchBar.alert(tResult.error);
  } else {
    // Evaluate result
    var currencySymbol = Action.preferences.budgetCurrencySymbol;

    tResult = eval('[' + tResult.data + ']');

    if (tResult[0].error != undefined) {
      LaunchBar.alert(
        tResult[0].error.id +
          ' ' +
          tResult[0].error.name +
          ': ' +
          tResult[0].error.detail
      );
      return;
    }

    var tData = tResult[0].data.transaction;
    var tAmount = tData.amount / 1000;
    tAmount = tAmount.toFixed(2).toString();
    var tCleared = tData.cleared;

    if (tCleared == 'uncleared') {
      var tSub = 'Amount (uncleared)';
    } else {
      var tSub = 'Amount';
    }

    var tDate = tData.date;
    var tPayee = tData.payee_name;
    var tCat = tData.category_name;
    var tCatId = tData.category_id;
    var tAcc = tData.account_name;
    var tAccId = tData.account_id; // To check Account balance
    var tMemo = tData.memo;
    var link = 'https://app.youneedabudget.com/' + budgetID + '/accounts';

    if (tMemo != null && tMemo.includes('message://')) {
      link = tMemo.match(/(message:\S*)/).toString();
    }

    if (tPayee.includes('Transfer')) {
      var pIcon = 'transferInTemplate';
      var aIcon = 'transferOutTemplate';
    } else {
      var pIcon = 'payeeTemplate';
      var aIcon = Action.preferences.recentAccountIcon;
    }

    if (currencySymbol == '€') {
      var cIcon = 'euroTemplate';
      tAmount = tAmount.replace(/\./, ',') + currencySymbol;
    } else {
      var cIcon = 'dollarTemplate';
      tAmount = tAmount.replace(/-/, '');
      tAmount = '-' + currencySymbol + tAmount;
    }

    // Refresh Payees (if a new one was added)
    if (Action.preferences.updatePayees == true) {
      var pOnlineData = HTTP.getJSON(
        'https://api.youneedabudget.com/v1/budgets/' +
          budgetID +
          '/payees?access_token=' +
          token,
        3
      ).data;

      var pLocalData = File.readJSON(
        Action.supportPath + '/' + budgetID + '/payees.json'
      );

      // Compare Online to Local payee data
      var ids = pLocalData.data.payees.map((ch) => ch.id);
      var newIds = pOnlineData.data.payees.filter((ch) => !ids.includes(ch.id));

      for (var i = 0; i < newIds.length; i++) {
        // Add last used category id info to the new payee
        if (newIds[i].name == Action.preferences.recentPayeeName) {
          newIds[i].last_used_category_id = Action.preferences.recentCategory;
        }
        pLocalData.data.payees.push(newIds[i]);
      }

      File.writeJSON(
        pLocalData,
        Action.supportPath + '/' + budgetID + '/payees.json'
      );
    } else {
      // Set last_used_category and last_used_payee in payee.json

      var payeeDataPath = Action.supportPath + '/' + budgetID + '/payees.json';
      var payeeData = File.readJSON(payeeDataPath);

      var recentPayeeIndex = Action.preferences.recentPayeeIndex;

      payeeData.data.payees[recentPayeeIndex].last_used_category_id =
        Action.preferences.recentCategory;

      payeeData.data.payees[recentPayeeIndex].last_used_account_id =
        Action.preferences.recentAccountID;

      File.writeJSON(payeeData, payeeDataPath);
    }

    // Check Category Balance
    var cData = HTTP.getJSON(
      'https://api.youneedabudget.com/v1/budgets/' +
        budgetID +
        '/categories/' +
        tCatId +
        '?access_token=' +
        token
    );

    if (tCat != 'Uncategorized' && tCat != 'Inflow: Ready to Assign') {
      var balance = cData.data.data.category.balance / 1000;
      balance = balance.toFixed(2).toString();
      if (currencySymbol == '€') {
        balance = balance.replace(/\./, ',') + currencySymbol;
        if (balance.includes('-')) {
          var catIcon = 'categoryRed';
        } else {
          var catIcon = 'categoryTemplate';
        }
      } else {
        if (balance.includes('-')) {
          balance = balance.replace(/-/, '');
          balance = '-' + currencySymbol + balance;
          var catIcon = 'categoryRed';
          link = 'https://app.youneedabudget.com/' + budgetID + '/accounts';
        } else {
          balance = currencySymbol + balance;
          var catIcon = 'categoryTemplate';
        }
      }
      var catSub = 'Category' + ' (Balance: ' + balance + ')';
    } else {
      var catIcon = 'categoryTemplate';
      var catSub = 'Category';
    }

    // Check Account Balance
    var aBalanceData = HTTP.getJSON(
      'https://api.youneedabudget.com/v1/budgets/' +
        budgetID +
        '/accounts/' +
        tAccId +
        '?access_token=' +
        token
    );

    var accountBalance = aBalanceData.data.data.account.cleared_balance / 1000;
    accountBalance = accountBalance.toFixed(2).toString();
    if (currencySymbol == '€') {
      accountBalance = accountBalance.replace(/\./, ',') + currencySymbol;
      // if (accountBalance.includes('-')) {
      //     var aIcon = 'accountRed'
      // } else {
      //     var aIcon = 'accountTemplate'
      // }
    } else {
      if (accountBalance.includes('-')) {
        accountBalance = accountBalance.replace(/-/, '');
        accountBalance = '-' + currencySymbol + accountBalance;
        // var catIcon = 'accountRed'
        link = 'https://app.youneedabudget.com/' + budgetID + '/accounts';
      } else {
        accountBalance = currencySymbol + accountBalance;
        // var catIcon = 'accountTemplate'
      }
    }
    var accSub = 'Account' + ' (Balance: ' + accountBalance + ')';

    // Show Result
    if (tMemo == '') {
      return [
        {
          title: tAmount,
          subtitle: tSub,
          icon: cIcon,
          url: link,
          alwaysShowsSubtitle: true,
        },
        {
          title: tDate,
          subtitle: 'Date',
          icon: 'calTemplate',
          url: link,
          alwaysShowsSubtitle: true,
        },
        {
          title: tPayee,
          subtitle: 'Payee',
          icon: pIcon,
          url: link,
          alwaysShowsSubtitle: true,
        },
        {
          title: tCat,
          subtitle: catSub,
          icon: catIcon,
          url: link,
          alwaysShowsSubtitle: true,
        },
        {
          title: tAcc,
          subtitle: accSub, // 'Account',
          icon: aIcon,
          url: link,
          alwaysShowsSubtitle: true,
        },
      ];
    } else {
      return [
        {
          title: tAmount,
          subtitle: tSub,
          icon: cIcon,
          url: link,
          alwaysShowsSubtitle: true,
        },
        {
          title: tDate,
          subtitle: 'Date',
          icon: 'calTemplate',
          url: link,
          alwaysShowsSubtitle: true,
        },
        {
          title: tPayee,
          subtitle: 'Payee',
          icon: pIcon,
          url: link,
          alwaysShowsSubtitle: true,
        },
        {
          title: tCat,
          subtitle: catSub,
          icon: catIcon,
          url: link,
          alwaysShowsSubtitle: true,
        },
        {
          title: tAcc,
          subtitle: accSub, // 'Account',
          icon: aIcon,
          url: link,
          alwaysShowsSubtitle: true,
        },
        {
          title: tMemo,
          subtitle: 'Memo',
          icon: Action.preferences.recentMemoIcon,
          url: link,
          alwaysShowsSubtitle: true,
        },
      ];
    }
  }
}

// Setting Functions
function setToken() {
  var response = LaunchBar.alert(
    'Personal Access Token required',
    'You can creat your Personal Access Token at https://app.youneedabudget.com/settings/developer. Copy it to your clipboard, run the action again and choose »Set Token«.\n\nYour clipboard is currently set to: ' +
      LaunchBar.getClipboardString().trim(),
    'Open Website',
    'Set Token',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.openURL('https://app.youneedabudget.com/settings/developer');
      LaunchBar.hide();
      break;
    case 1:
      Action.preferences.accessToken = LaunchBar.getClipboardString().trim();
      LaunchBar.alert(
        'Success!',
        'Token set to: ' + Action.preferences.accessToken
      );
      break;
    case 2:
      break;
  }
}

function budgetSettings() {
  var bData = HTTP.getJSON(
    'https://api.youneedabudget.com/v1/budgets/?access_token=' + token
  );

  if (bData.error != undefined) {
    LaunchBar.alert(bData.error);
  } else {
    if (bData.data.error != undefined) {
      LaunchBar.alert(
        'Error ' + bData.data.error.id + ' ' + bData.data.error.name,
        'Your token "' +
          Action.preferences.accessToken +
          '" seems to be invalid. Try to set your token again!'
      );
      setToken();
    } else {
      var results = [];
      for (var i = 0; i < bData.data.data.budgets.length; i++) {
        var bName = bData.data.data.budgets[i].name;
        var bId = bData.data.data.budgets[i].id;

        if (bId == Action.preferences.budgetID) {
          var icon = 'selectedBudgetTemplate';
          var badge = 'Current Budget';
        } else {
          var icon = 'budgetTemplate';
          var badge = 'Budget Setting';
        }

        results.push({
          title: bName,
          icon: icon,
          action: 'setBudgetID',
          badge: badge,
          actionArgument: bId,
        });
      }
      results.sort(function (a, b) {
        return a.title > b.title;
      });
      return results;
    }
  }
}
function setBudgetID(bId) {
  // Set Budget ID
  Action.preferences.budgetID = bId;

  if (File.exists(Action.supportPath + '/' + bId)) {
    // File or folder exists
    var bData = File.readJSON(
      Action.supportPath + '/' + bId + '/budgetSettings.json'
    );
    Action.preferences.budgetCurrencySymbol =
      bData.data.settings.currency_format.currency_symbol;

    // TODO: Daten abgleichen und aktualisieren
    //
    //
  } else {
    // Preload data
    LaunchBar.hide();

    var bData = HTTP.getJSON(
      'https://api.youneedabudget.com/v1/budgets/' +
        bId +
        '/settings/?access_token=' +
        token
    );

    Action.preferences.budgetCurrencySymbol =
      bData.data.data.settings.currency_format.currency_symbol;

    var pData = HTTP.getJSON(
      'https://api.youneedabudget.com/v1/budgets/' +
        bId +
        '/payees?access_token=' +
        token,
      3
    );
    var cData = HTTP.getJSON(
      'https://api.youneedabudget.com/v1/budgets/' +
        bId +
        '/categories?access_token=' +
        token,
      3
    );
    var aData = HTTP.getJSON(
      'https://api.youneedabudget.com/v1/budgets/' +
        bId +
        '/accounts?access_token=' +
        token,
      3
    );

    File.createDirectory(Action.supportPath + '/' + bId);

    File.writeJSON(
      bData.data,
      Action.supportPath + '/' + bId + '/budgetSettings.json'
    );

    File.writeJSON(
      cData.data,
      Action.supportPath + '/' + bId + '/categories.json'
    );
    File.writeJSON(pData.data, Action.supportPath + '/' + bId + '/payees.json');
    File.writeJSON(
      aData.data,
      Action.supportPath + '/' + bId + '/accounts.json'
    );
  }

  var output = budgetSettings();
  return output;
}

function clearedSettings() {
  var sub = 'Hit return to change!';

  if (Action.preferences.clearedSettingsOtherAsset == undefined) {
    var oA = 'uncleared';
    var oState = 'cleared'; // to be set
  } else {
    var oA = Action.preferences.clearedSettingsOtherAsset;

    if (oA == 'uncleared') {
      var oState = 'cleared';
    } else {
      var oState = 'uncleared';
    }
  }

  if (Action.preferences.clearedSettingsCash == undefined) {
    var cash = 'cleared';
    var cashState = 'uncleared';
  } else {
    var cash = Action.preferences.clearedSettingsCash;

    if (cash == 'uncleared') {
      var cashState = 'cleared';
    } else {
      var cashState = 'uncleared';
    }
  }

  if (Action.preferences.clearedSettingsChecking == undefined) {
    var checking = 'uncleared';
    var checkingState = 'cleared';
  } else {
    var checking = Action.preferences.clearedSettingsChecking;

    if (checking == 'uncleared') {
      var checkingState = 'cleared';
    } else {
      var checkingState = 'uncleared';
    }
  }

  return [
    {
      title: 'Cash: ' + cash,
      subtitle: sub,
      icon: 'cashTemplate',
      badge: 'Cleared/Uncleared Setting',
      action: 'setClearedSetting',
      actionArgument: {
        cState: cashState,
        aType: 'cash',
      },
      alwaysShowsSubtitle: true,
    },
    {
      title: 'Checking: ' + checking,
      subtitle: sub,
      icon: 'accountTemplate',
      badge: 'Cleared/Uncleared Setting',
      action: 'setClearedSetting',
      actionArgument: {
        cState: checkingState,
        aType: 'checking',
      },
      alwaysShowsSubtitle: true,
    },
    {
      title: 'Other Asset: ' + oA,
      subtitle: sub,
      icon: 'trackingAccountTemplate',
      badge: 'Cleared/Uncleared Setting',
      action: 'setClearedSetting',
      actionArgument: {
        cState: oState,
        aType: 'otherAsset',
      },
      alwaysShowsSubtitle: true,
    },
  ];
}
function setClearedSetting(cInfo) {
  cState = cInfo.cState;
  aType = cInfo.aType;

  if (aType == undefined) {
    Action.preferences.clearedSettingsOtherAsset = cState;
    Action.preferences.clearedSettingsCash = cState;
    Action.preferences.clearedSettingsChecking = cState;
  } else if (aType == 'otherAsset') {
    Action.preferences.clearedSettingsOtherAsset = cState;
  } else if (aType == 'cash') {
    Action.preferences.clearedSettingsCash = cState;
  } else if (aType == 'checking') {
    Action.preferences.clearedSettingsChecking = cState;
  }
  output = clearedSettings();
  return output;
}

function pinCategory() {
  // Check if local data is available
  if (!File.exists(Action.supportPath + '/' + budgetID)) {
    // Update
    LaunchBar.alert('Your data needs to be updated.');
    var output = resetData();

    if (output != 'success') {
      return;
    }
  }

  // Pinned Category
  var pinnedCategoryPath =
    Action.supportPath + '/' + budgetID + '/pinnedCategory.json';
  if (File.exists(pinnedCategoryPath)) {
    var pinnedCategory = File.readJSON(pinnedCategoryPath);
  }

  // Category
  try {
    var cData = File.readJSON(
      Action.supportPath + '/' + budgetID + '/categories.json'
    );
    // Use object
  } catch (exception) {
    LaunchBar.alert('Error while reading JSON: ' + exception);
  }

  if (cData.error != undefined) {
    LaunchBar.alert(
      'Error ' + cData.error.id + ' ' + cData.error.name,
      'Your token "' +
        Action.preferences.accessToken +
        '" seems to be invalid. Try to set your token again!'
    );
    setToken();
    return;
  }

  var cGroups = cData.data.category_groups;
  cGroups = cGroups.filter(function (el) {
    return el.name != 'Hidden Categories';
  });

  var internalCategories = [];
  var userCategories = [];
  var i = 0;
  for (i = 0; i < cGroups.length; i++) {
    var categories = cGroups[i].categories;
    var j = 0;
    for (j = 0; j < categories.length; j++) {
      var categoryPushData = {
        title: categories[j].name,
        subtitle: cGroups[i].name,
        icon: 'categoryTemplate.png',
        badge: 'Pin Category Setting',
        action: 'setPin',
        actionArgument: {
          pinTitle: categories[j].name,
          pinSubtitle: cGroups[i].name,
          pinID: categories[j].id,
        },
        alwaysShowsSubtitle: true,
      };
      if (cGroups[i].name == 'Internal Master Category') {
        if (pinnedCategory != undefined) {
          if (categories[j].name != pinnedCategory.title) {
            internalCategories.push(categoryPushData);
          }
        } else {
          internalCategories.push(categoryPushData);
        }
      } else {
        if (pinnedCategory != undefined) {
          if (categories[j].name != pinnedCategory.title) {
            userCategories.push(categoryPushData);
          }
        } else {
          userCategories.push(categoryPushData);
        }
      }
    }
  }
  var pin = userCategories.concat(internalCategories);

  if (pinnedCategory != undefined) {
    var pinnedCategory = [
      {
        title: pinnedCategory.title, // TODO: ändern
        subtitle: 'Hit enter to unpin this category!',
        icon: 'selectedCategoryTemplate.png',
        badge: 'Pinned',
        action: 'setPin',
        actionArgument: 'unpin',
        alwaysShowsSubtitle: true,
      },
    ];
    var result = pinnedCategory.concat(pin);
  } else {
    var result = pin;
  }
  return result;
}
function setPin(pin) {
  var fileLocation =
    Action.supportPath + '/' + budgetID + '/pinnedCategory.json';

  if (pin == 'unpin') {
    File.writeJSON([], fileLocation);
  } else {
    var pinnedCategory = {
      title: pin.pinTitle,
      subtitle: pin.pinSubtitle,
      icon: 'categoryTemplate',
      badge: 'Pinned',
      action: 'setCategoryAndContinue',
      actionArgument: pin.pinID,
      alwaysShowsSubtitle: true,
    };
    File.writeJSON(pinnedCategory, fileLocation);
  }

  var output = pinCategory();
  return output;
}

function dataRefresh() {
  // Preload data
  return [
    {
      title: 'Update payees for current budget',
      subtitle: 'Preserves info for smart suggestions of existing payees.',
      icon: 'refreshTemplate',
      action: 'updatePayees',
      actionRunsInBackground: true,
      alwaysShowsSubtitle: true,
    },
    {
      title: 'Update other data for current budget',
      subtitle: 'Overwrites current categories, accounts and budget settings!',
      icon: 'refreshTemplate',
      action: 'updateRest',
      actionRunsInBackground: true,
      alwaysShowsSubtitle: true,
    },
    {
      title: 'Reset all data for all budgets',
      subtitle:
        'Reset all preloaded data for all budgets. Overwrites all current data!',
      icon: 'refreshTemplate',
      action: 'resetData',
      actionRunsInBackground: true,
      alwaysShowsSubtitle: true,
    },
  ];
}
function updatePayees() {
  var pOnlineData = HTTP.getJSON(
    'https://api.youneedabudget.com/v1/budgets/' +
      budgetID +
      '/payees?access_token=' +
      token,
    3
  );

  if (pOnlineData.error != undefined) {
    LaunchBar.alert(pOnlineData.error);
  } else {
    LaunchBar.hide();
    var pLocalData = File.readJSON(
      Action.supportPath + '/' + budgetID + '/payees.json'
    );

    // Add new payess
    var localIds = pLocalData.data.payees.map((ch) => ch.id);
    var newIds = pOnlineData.data.data.payees.filter(
      (ch) => !localIds.includes(ch.id)
    );

    for (var i = 0; i < newIds.length; i++) {
      pLocalData.data.payees.push(newIds[i]);
    }

    // Remove old payess
    var onlineIds = pOnlineData.data.data.payees.map((ch) => ch.id);
    var oldIds = pLocalData.data.payees.filter(
      (ch) => !onlineIds.includes(ch.id)
    );

    for (var i = 0; i < oldIds.length; i++) {
      for (var j = 0; j < pLocalData.data.payees.length; j++) {
        if (pLocalData.data.payees[j] == oldIds[i]) {
          pLocalData.data.payees.splice(j, 1);
        }
      }
    }

    File.writeJSON(
      pLocalData,
      Action.supportPath + '/' + budgetID + '/payees.json'
    );

    var changes = newIds.length + oldIds.length;

    LaunchBar.displayNotification({
      title: 'YNAB Payees updated',
      subtitle: changes + ' change(s)',
    });
  }
}
function updateRest() {
  var bSettingsData = HTTP.getJSON(
    'https://api.youneedabudget.com/v1/budgets/' +
      budgetID +
      '/settings/?access_token=' +
      token
  );

  if (bSettingsData.error != undefined) {
    LaunchBar.alert(bSettingsData.error);
  } else {
    LaunchBar.hide();
    var cData = HTTP.getJSON(
      'https://api.youneedabudget.com/v1/budgets/' +
        budgetID +
        '/categories?access_token=' +
        token,
      3
    );
    var aData = HTTP.getJSON(
      'https://api.youneedabudget.com/v1/budgets/' +
        budgetID +
        '/accounts?access_token=' +
        token,
      3
    );

    File.writeJSON(
      bSettingsData.data,
      Action.supportPath + '/' + budgetID + '/budgetSettings.json'
    );

    File.writeJSON(
      cData.data,
      Action.supportPath + '/' + budgetID + '/categories.json'
    );
    File.writeJSON(
      aData.data,
      Action.supportPath + '/' + budgetID + '/accounts.json'
    );

    LaunchBar.displayNotification({
      title: 'Success!',
      subtitle:
        'You have successfully updated categories, accounts and budget settings.',
    });
  }
}
function resetData() {
  var budgetData = HTTP.getJSON(
    'https://api.youneedabudget.com/v1/budgets/' + '?access_token=' + token
  );

  if (budgetData.error != undefined) {
    LaunchBar.alert(budgetData.error);
  } else {
    LaunchBar.hide();

    budgetData = budgetData.data.data.budgets;
    for (var i = 0; i < budgetData.length; i++) {
      var bId = budgetData[i].id;

      var bSettingsData = HTTP.getJSON(
        'https://api.youneedabudget.com/v1/budgets/' +
          bId +
          '/settings/?access_token=' +
          token
      );

      var pData = HTTP.getJSON(
        'https://api.youneedabudget.com/v1/budgets/' +
          bId +
          '/payees?access_token=' +
          token,
        3
      );
      var cData = HTTP.getJSON(
        'https://api.youneedabudget.com/v1/budgets/' +
          bId +
          '/categories?access_token=' +
          token,
        3
      );
      var aData = HTTP.getJSON(
        'https://api.youneedabudget.com/v1/budgets/' +
          bId +
          '/accounts?access_token=' +
          token,
        3
      );

      File.createDirectory(Action.supportPath + '/' + bId);

      File.writeJSON(
        bSettingsData.data,
        Action.supportPath + '/' + bId + '/budgetSettings.json'
      );
      File.writeJSON(
        cData.data,
        Action.supportPath + '/' + bId + '/categories.json'
      );
      File.writeJSON(
        pData.data,
        Action.supportPath + '/' + bId + '/payees.json'
      );
      File.writeJSON(
        aData.data,
        Action.supportPath + '/' + bId + '/accounts.json'
      );
    }

    LaunchBar.displayNotification({
      title: 'Success!',
      subtitle: 'You have successfully reset all your YNAB data.',
    });

    return 'success';
  }
}
