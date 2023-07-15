/* 
YNAB - Add Transaction Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
https://api.youneedabudget.com/
*/

const ActionPrefs = Action.preferences;
const token = ActionPrefs.accessToken;
const apiBaseURL = 'https://api.youneedabudget.com/v1';
const budgetID = ActionPrefs.budgetID;
const budgetDataDir = `${Action.supportPath}/${budgetID}`;
const pinnedCategories = Action.preferences.pinnedCategories ?? {};
const cLocale = LaunchBar.currentLocale;

// Check token, budget ID, entry, set amount and show payees
function run(argument) {
  if (!token) {
    setToken();
    return;
  }

  if (!budgetID) {
    return [
      {
        title: 'Choose Budget',
        subtitle: 'Choose the budget you want to use this action for.',
        icon: 'budgetTemplate',
        action: 'budgetSettings',
        alwaysShowsSubtitle: true,
      },
    ];
  }

  if (!argument) return settings();

  // Check if entry is valid
  if (!/\d/.test(argument)) {
    return [
      {
        title: 'No valid entry!',
        icon: 'warningTemplate',
      },
    ];
  }

  // Check if currency is set -- for update to 2.4
  if (budgetID && !ActionPrefs.budgetCurrency) {
    if (File.exists(`${Action.supportPath}/${budgetID}`)) {
      ActionPrefs.budgetCurrency = File.readJSON(
        `${Action.supportPath}/${budgetID}/budgetSettings.json`
      ).data.settings.currency_format.iso_code;
    } else {
      return budgetSettings();
    }
  }

  return setAmount(argument);
}

function setAmount(argument) {
  // Check if income or expense
  let income;
  if (argument.startsWith('+')) {
    income = true;
    argument = argument.replace(/\+/, '');
  } else {
    income = false;
  }

  // Amount
  if (argument.includes(',') || argument.includes('.')) {
    argument = argument.replace(/[^\d,.+]/g, '').trim();

    const test = argument.match(/(?:,|\.)(\d*)/);
    const testLength = test[1].length;

    if (testLength == 1) {
      amount = `${argument}00`;
    } else if (testLength < 1) {
      amount = `${argument}000`;
    } else {
      amount = `${argument}0`;
    }
    amount = amount.replace(/,|\./, '');
  } else {
    argument = argument.replace(/[^\d,.+€\$]/g, '').trim();

    if (argument.includes('€') || argument.includes('$')) {
      argument = argument.replace(/€|\$/g, '').trim();

      if (argument) {
        amount = `${argument}000`;
      } else {
        return [
          {
            title: 'No valid amount',
            icon: 'warningTemplate',
          },
        ];
      }
    } else {
      amount = `${argument}0`;
    }
  }

  if (income == false) amount = `-${amount}`;

  ActionPrefs.recentAmount = parseInt(amount);

  return showPayees();
}

function showPayees() {
  // Check if local data is available
  if (!File.exists(budgetDataDir)) {
    // Update
    LaunchBar.alert('Your data needs to be updated.');
    const output = resetData();
    if (output != 'success') return;
  }

  const payees = File.readJSON(`${budgetDataDir}/payees.json`).data.payees;

  const existingPayees = payees
    .map((payee, index) => {
      const pName = payee.name;
      const pId = payee.id;
      const lastUsedCategoryId = payee.last_used_category_id;
      const lastUsedAccountId = payee.last_used_account_id;

      const icon = pName.includes('Transfer')
        ? 'transferTemplate'
        : 'payeeTemplate';

      return {
        title: pName,
        icon: icon,
        action: 'setPayee',
        actionArgument: {
          pName,
          pId,
          pIndex: index,
          lastUsedCategoryId,
          lastUsedAccountId,
        },
      };
    })
    .sort((a, b) => a.title > b.title);

  const newPayee = [
    {
      title: 'New Payee',
      icon: 'newTemplate.png',
      action: 'setPayee',
      actionArgument: {
        pName: 'Enter New Payee',
      },
    },
  ];
  return [...newPayee, ...existingPayees];
}

function setPayee({
  pName,
  pId,
  pIndex,
  lastUsedAccountId,
  lastUsedCategoryId,
}) {
  if (pName == 'Enter New Payee') {
    LaunchBar.hide();
    pName = LaunchBar.executeAppleScript(
      'set result to display dialog "Payee" with title "Payee" default answer ""',
      'set result to text returned of result'
    ).trim();

    if (pName == '') {
      return;
    }
    ActionPrefs.updatePayees = true;
  } else {
    ActionPrefs.updatePayees = false;
  }

  ActionPrefs.recentPayeeName = pName;
  ActionPrefs.recentPayeeId = pId;
  ActionPrefs.recentPayeeIndex = pIndex;
  ActionPrefs.recentPayeeLastUsedAccountId = lastUsedAccountId;

  return showCategories({ lastUsedCategoryId });
}

function showCategories({ lastUsedCategoryId, isSetting }) {
  const cGroups = File.readJSON(
    `${budgetDataDir}/categories.json`
  ).data.category_groups.filter((group) => group.name != 'Hidden Categories');

  const pinnedCategoryID = pinnedCategories[budgetID];

  let internalCategories = [];
  let userCategories = [];
  let categoryMatchingPayee = [];
  let pinnedCategory = [];

  for (const cGroup of cGroups) {
    const categories = cGroup.categories.filter((category) => !category.hidden);
    const cGroupName = cGroup.name;
    const categoriesArray =
      cGroupName == 'Internal Master Category'
        ? internalCategories
        : userCategories;

    for (const category of categories) {
      const categoryName = category.name;
      const categoryID = category.id;

      const categoryPushData = {
        title: categoryName,
        subtitle: cGroupName,
        icon: 'categoryTemplate.png',
        badge: isSetting ? 'Pin Category Setting' : undefined,
        action: isSetting ? 'setPin' : 'setCategory',
        actionArgument: {
          categoryID,
          unpin: false,
        },
        alwaysShowsSubtitle: true,
      };

      if (categoryID == lastUsedCategoryId) {
        categoryPushData.badge = 'Used Last Time';
        categoryMatchingPayee = categoryPushData;
      } else if (categoryID == pinnedCategoryID) {
        categoryPushData.badge = 'Pinned';
        if (isSetting) {
          categoryPushData.subtitle = 'Hit enter to unpin this category!';
          categoryPushData.icon = 'selectedCategoryTemplate';
          categoryPushData.action = 'setPin';
          categoryPushData.actionArgument.unpin = true;
        }
        pinnedCategory = categoryPushData;
      } else {
        categoriesArray.push(categoryPushData);
      }
    }
  }

  const result = [
    categoryMatchingPayee,
    pinnedCategory,
    ...userCategories,
    ...internalCategories,
  ];

  if (!result) {
    const response = LaunchBar.alert(
      'No categories!',
      'Go to the YNAB.com and try editing some category name. Then update preloaded data.',
      'Open YNAB.com',
      'Update preloaded data',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.hide();
        LaunchBar.openURL(`https://app.youneedabudget.com/${budgetID}/budget`);
        break;
      case 1:
        updateRest();
        break;
      case 2:
        break;
    }
    return;
  }
  return result;
}

function setCategory({ categoryID }) {
  ActionPrefs.recentCategory = categoryID;
  return showAccounts();
}

function showAccounts() {
  var accounts = File.readJSON(
    `${budgetDataDir}/accounts.json`
  ).data.accounts.filter((account) => !account.closed);

  var allAccounts = [];
  var accountMatchingPayee = [];

  const iconMap = {
    cash: 'cashTemplate.png',
    otherAsset: 'trackingAccountTemplate.png',
    default: 'accountTemplate',
  };

  for (const account of accounts) {
    const icon = iconMap[account.type] || iconMap.default;

    const pushData = {
      title: account.name,
      icon,
      action: 'setAccountAndCleared',
      actionArgument: {
        accountID: account.id,
        accountType: account.type,
        accountIcon: icon,
      },
    };

    if (account.id === ActionPrefs.recentPayeeLastUsedAccountId) {
      pushData.badge = 'Used Last Time';
      accountMatchingPayee.push(pushData);
    } else {
      allAccounts.push(pushData);
    }
  }

  return [...accountMatchingPayee, ...allAccounts];
}

function setAccountAndCleared({ accountID, accountType, accountIcon }) {
  ActionPrefs.recentAccountID = accountID;
  ActionPrefs.recentAccountIcon = accountIcon;

  // Cleared Settings
  let cleared =
    accountType == 'otherAsset'
      ? ActionPrefs.clearedSettingsOtherAsset
      : accountType == 'checking'
      ? ActionPrefs.clearedSettingsChecking
      : accountType == 'cash'
      ? ActionPrefs.clearedSettingsCash
      : undefined;

  cleared = cleared || (accountType == 'cash' ? 'cleared' : 'uncleared');
  ActionPrefs.recentCleared = cleared;

  return showDates();
}

function showDates() {
  // Dates
  let dates = [];
  for (var i = 0; i > -180; i--) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const dateString = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split('T')[0];

    dates.push({
      title: dateString,
      icon: 'calTemplate',
      action: 'setDate',
      actionArgument: dateString,
    });
  }
  return dates;
}

function setDate(dateString) {
  ActionPrefs.recentDate = dateString;
  return showMemoOptions();
}

function showMemoOptions() {
  return [
    {
      title: 'No Memo',
      icon: 'noTemplate.png',
      action: 'setMemo',
      actionArgument: '',
    },
    {
      title: 'Add Memo',
      icon: 'newTemplate.png',
      action: 'setMemo',
      actionArgument: 'Add Memo',
    },
  ];
}

function setMemo(memo) {
  if (memo == 'Add Memo') {
    LaunchBar.hide();

    // Check for Mail URL and show memo dialog
    const [mailLinkRaw, subjectRaw] = LaunchBar.executeAppleScriptFile(
      './mail.applescript'
    )
      .trim()
      .split('\n');

    let defaultAnswer = '';

    if (mailLinkRaw && subjectRaw) {
      const mailLink = encodeURI(decodeURI(mailLinkRaw));
      let subject = subjectRaw.replace(/fwd: |aw: |wtr: |re: |fw: /gi, '');

      // Trim subject if combined length exceeds 199
      const maxLength = 199 - mailLink.length;
      if (subject.length > maxLength) {
        subject = `${subject.substring(0, maxLength - 1)}…`;
      }

      defaultAnswer = `${subject} ${mailLink}`;
    }

    // Display dialog for memo input
    memo = LaunchBar.executeAppleScript(
      `set result to display dialog "Memo" with title "Memo" default answer "${defaultAnswer}"`,
      'set result to text returned of result'
    ).trim();

    if (!memo) return; // If a user cancels
  }

  ActionPrefs.recentMemo = memo;
  return postTransaction();
}

function postTransaction() {
  const transactionResult = HTTP.postJSON(
    `${apiBaseURL}/budgets/${budgetID}/transactions?access_token=${token}`,
    {
      body: {
        transaction: {
          account_id: ActionPrefs.recentAccountID,
          date: ActionPrefs.recentDate,
          amount: ActionPrefs.recentAmount,
          payee_id: ActionPrefs.recentPayeeId,
          payee_name: ActionPrefs.recentPayeeName,
          category_id: ActionPrefs.recentCategory,
          memo: ActionPrefs.recentMemo,
          cleared: ActionPrefs.recentCleared,
          approved: true,
          flag_color: null,
          import_id: null,
          subtransactions: [],
        },
      },
    }
  );
  return processTransactionResult(transactionResult);
}

function processTransactionResult(transactionResult) {
  const currency = ActionPrefs.budgetCurrency;

  if (transactionResult.error) {
    LaunchBar.alert(transactionResult.error);
    return;
  }

  transactionResult = eval(`[${transactionResult.data}]`)[0];

  if (transactionResult.error) {
    const error = transactionResult.error;
    LaunchBar.alert(`${error.id} ${error.name}: ${error.detail}`);
    return;
  }

  const transaction = transactionResult.data.transaction;

  let amount = (transaction.amount / 1000).toLocaleString(cLocale, {
    style: 'currency',
    currency,
  });

  const subtitle =
    transaction.cleared == 'uncleared' ? 'Amount (uncleared)' : 'Amount';

  const transactionDate = transaction.date;
  const payeeName = transaction.payee_name;
  const categoryName = transaction.category_name;
  const categoryID = transaction.category_id;
  const accountName = transaction.account_name;
  const accountNameId = transaction.account_id;
  const memo = transaction.memo;
  let url = `https://app.youneedabudget.com/${budgetID}/accounts`;

  if (memo != null && memo.includes('message://')) {
    url = memo.match(/(message:\S*)/).toString();
  }

  const payeeIcon = payeeName.includes('Transfer')
    ? 'transferInTemplate'
    : 'payeeTemplate';
  const accountIcon = payeeName.includes('Transfer')
    ? 'transferOutTemplate'
    : ActionPrefs.recentAccountIcon;

  const currencyIcon = currency == 'EUR' ? 'euroTemplate' : 'dollarTemplate';

  // Refresh Payees (if a new one was added)
  if (ActionPrefs.updatePayees == true) {
    updatePayees({ isSetting: false });
  } else {
    // Set last_used_category and last_used_payee in payee.json
    const payeeDataPath = `${budgetDataDir}/payees.json`;
    const payeeData = File.readJSON(payeeDataPath);
    const recentPayeeIndex = ActionPrefs.recentPayeeIndex;

    payeeData.data.payees[recentPayeeIndex].last_used_category_id =
      ActionPrefs.recentCategory;

    payeeData.data.payees[recentPayeeIndex].last_used_account_id =
      ActionPrefs.recentAccountID;

    File.writeJSON(payeeData, payeeDataPath);
  }

  let categorySubtitle = 'Category';
  let categoryIcon = 'categoryTemplate';

  if (
    categoryName != 'Uncategorized' &&
    categoryName != 'Inflow: Ready to Assign'
  ) {
    // Check Category Balance
    const categoryBalance = HTTP.getJSON(
      `${apiBaseURL}/budgets/${budgetID}/categories/${categoryID}?access_token=${token}`
    ).data.data.category.balance;

    const categoryBalanceString = (categoryBalance / 1000).toLocaleString(
      cLocale,
      {
        style: 'currency',
        currency,
      }
    );

    categoryIcon = categoryBalanceString.includes('-')
      ? 'categoryRed'
      : categoryIcon;

    categorySubtitle += ` (Balance: ${categoryBalanceString})`;
  }

  // Check Account Balance
  const accountBalance = HTTP.getJSON(
    `${apiBaseURL}/budgets/${budgetID}/accounts/${accountNameId}?access_token=${token}`
  ).data.data.account.cleared_balance;

  const accountBalanceString = (accountBalance / 1000).toLocaleString(cLocale, {
    style: 'currency',
    currency,
  });

  const accountSubtitle = `Account (Balance: ${accountBalanceString})`;

  // Show Result
  let result = [
    { title: amount, subtitle: subtitle, icon: currencyIcon },
    { title: transactionDate, subtitle: 'Date', icon: 'calTemplate' },
    { title: payeeName, subtitle: 'Payee', icon: payeeIcon },
    { title: categoryName, subtitle: categorySubtitle, icon: categoryIcon },
    { title: accountName, subtitle: accountSubtitle, icon: accountIcon },
  ];

  if (memo)
    result = [
      ...result,
      { title: memo, subtitle: 'Memo', icon: 'memoTemplate' },
    ];

  for (const item of result) {
    item.url = url;
    item.alwaysShowsSubtitle = true;
  }

  return result;
}

// Setting Functions
function setToken() {
  const response = LaunchBar.alert(
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
      ActionPrefs.accessToken = LaunchBar.getClipboardString().trim();
      LaunchBar.alert('Success!', `Token set to: ${ActionPrefs.accessToken}`);
      break;
    case 2:
      break;
  }
}

function settings() {
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
      action: 'showCategories',
      actionArgument: {
        isSetting: true,
      },
      alwaysShowsSubtitle: true,
    },
    {
      title: 'Refresh Options',
      subtitle: 'Refresh preloaded data.',
      icon: 'refreshTemplate',
      badge: 'Settings',
      action: 'dataRefresh',
      alwaysShowsSubtitle: true,
    },
  ];
}

function budgetSettings() {
  const budgetData = HTTP.getJSON(
    `${apiBaseURL}/budgets/?access_token=${token}`
  );

  if (budgetData.error) {
    LaunchBar.alert(budgetData.error);
    return;
  }

  if (budgetData.data.error) {
    LaunchBar.alert(
      `Error ${budgetData.data.error.id} ${budgetData.data.error.name}`,
      `Your token "${ActionPrefs.accessToken}" seems to be invalid. Try to set your token again!`
    );
    setToken();
    return;
  }

  let results = [];
  for (const budget of budgetData.data.data.budgets) {
    const bName = budget.name;
    const bId = budget.id;

    let icon, badge;

    if (bId == ActionPrefs.budgetID) {
      icon = 'selectedBudgetTemplate';
      badge = 'Current Budget';
    } else {
      icon = 'budgetTemplate';
      badge = 'Budget Setting';
    }

    results.push({
      title: bName,
      icon,
      action: 'setBudgetID',
      badge,
      actionArgument: bId,
    });
  }
  results.sort((a, b) => a.title > b.title);

  return results;
}

function setBudgetID(bId) {
  // Set Budget ID
  ActionPrefs.budgetID = bId;

  if (File.exists(`${Action.supportPath}/${bId}`)) {
    // File or folder exists
    const budgetSettingsData = File.readJSON(
      `${Action.supportPath}/${bId}/budgetSettings.json`
    );
    ActionPrefs.budgetCurrency =
      budgetSettingsData.data.settings.currency_format.iso_code;
  } else {
    // Preload data
    LaunchBar.hide();

    const budgetSettingsData = HTTP.getJSON(
      `${apiBaseURL}/budgets/${bId}/settings/?access_token=${token}`
    );

    ActionPrefs.budgetCurrency =
      budgetSettingsData.data.data.settings.currency_format.iso_code;

    const payeeData = HTTP.getJSON(
      `${apiBaseURL}/budgets/${bId}/payees?access_token=${token}`
    );
    const categoryData = HTTP.getJSON(
      `${apiBaseURL}/budgets/${bId}/categories?access_token=${token}`
    );
    const accountData = HTTP.getJSON(
      `${apiBaseURL}/budgets/${bId}/accounts?access_token=${token}`
    );

    File.createDirectory(`${Action.supportPath}/${bId}`);

    File.writeJSON(
      budgetSettingsData.data,
      `${Action.supportPath}/${bId}/budgetSettings.json`
    );

    File.writeJSON(
      categoryData.data,
      `${Action.supportPath}/${bId}/categories.json`
    );

    File.writeJSON(payeeData.data, `${Action.supportPath}/${bId}/payees.json`);

    File.writeJSON(
      accountData.data,
      `${Action.supportPath}/${bId}/accounts.json`
    );
  }

  return budgetSettings();
}

function clearedSettings() {
  const clearedSettingOtherAsset =
    ActionPrefs.clearedSettingsOtherAsset == undefined
      ? 'uncleared'
      : ActionPrefs.clearedSettingsOtherAsset;
  const clearedSettingOtherAssetNew =
    clearedSettingOtherAsset == 'uncleared' ? 'cleared' : 'uncleared';

  const clearedSettingCash =
    ActionPrefs.clearedSettingsCash == undefined
      ? 'cleared'
      : ActionPrefs.clearedSettingsCash;
  const clearedSettingCashNew =
    clearedSettingCash == 'uncleared' ? 'cleared' : 'uncleared';

  const clearedSettingChecking =
    ActionPrefs.clearedSettingsChecking == undefined
      ? 'uncleared'
      : ActionPrefs.clearedSettingsChecking;
  const clearedSettingCheckingNew =
    clearedSettingChecking == 'uncleared' ? 'cleared' : 'uncleared';

  result = [
    {
      title: `Cash: ${clearedSettingCash}`,
      icon: 'cashTemplate',
      actionArgument: {
        clearedSetting: clearedSettingCashNew,
        accountType: 'cash',
      },
    },
    {
      title: `Checking: ${clearedSettingChecking}`,
      icon: 'accountTemplate',
      actionArgument: {
        clearedSetting: clearedSettingCheckingNew,
        accountType: 'checking',
      },
    },
    {
      title: `Other Asset: ${clearedSettingOtherAsset}`,
      icon: 'trackingAccountTemplate',
      actionArgument: {
        clearedSetting: clearedSettingOtherAssetNew,
        accountType: 'otherAsset',
      },
    },
  ];

  for (const item of result) {
    item.subtitle = 'Hit return to change!';
    item.badge = 'Cleared Setting';
    item.action = 'setClearedSetting';
    item.alwaysShowsSubtitle = true;
  }
  return result;
}

function setClearedSetting({ clearedSetting, accountType }) {
  switch (accountType) {
    case 'otherAsset':
      ActionPrefs.clearedSettingsOtherAsset = clearedSetting;
      break;
    case 'cash':
      ActionPrefs.clearedSettingsCash = clearedSetting;
      break;
    case 'checking':
      ActionPrefs.clearedSettingsChecking = clearedSetting;
      break;
  }

  return clearedSettings();
}

function setPin({ unpin, categoryID }) {
  if (unpin) {
    pinnedCategories[budgetID] = undefined;
  } else {
    pinnedCategories[budgetID] = categoryID;
  }
  Action.preferences.pinnedCategories = pinnedCategories;
  return showCategories({ isSetting: true });
}

function dataRefresh() {
  return [
    {
      title: 'Update payees for current budget',
      subtitle: 'Preserves info for smart suggestions of existing payees.',
      icon: 'refreshTemplate',
      action: 'updatePayees',
      actionArgument: { isSetting: true },
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

function updatePayees({ isSetting }) {
  const pOnlineData = HTTP.getJSON(
    `${apiBaseURL}/budgets/${budgetID}/payees?access_token=${token}`,
    3
  );

  if (pOnlineData.error != undefined) {
    LaunchBar.alert(pOnlineData.error);
    return;
  }

  LaunchBar.hide();
  const pLocalData = File.readJSON(`${budgetDataDir}/payees.json`);

  let changes = 0;

  // Add new payees
  const localIds = pLocalData.data.payees.map((payee) => payee.id);
  const newPayees = pOnlineData.data.data.payees.filter((payee) => {
    if (!localIds.includes(payee.id)) {
      changes++;

      if (!isSetting) payee.last_used_category_id = ActionPrefs.recentCategory;

      return true;
    }
    return false;
  });

  pLocalData.data.payees = [...pLocalData.data.payees, ...newPayees];

  // Remove old payees
  const onlineIds = pOnlineData.data.data.payees.map((payee) => payee.id);
  pLocalData.data.payees = pLocalData.data.payees.filter((payee) => {
    if (!onlineIds.includes(payee.id)) {
      changes++;
      return false;
    }
    return true;
  });

  File.writeJSON(pLocalData, `${budgetDataDir}/payees.json`);

  LaunchBar.displayNotification({
    title: 'YNAB Payees updated',
    subtitle: `${changes} change(s)`,
  });
}

function updateRest() {
  const budgetSettingsData = HTTP.getJSON(
    `${apiBaseURL}/budgets/${budgetID}/settings/?access_token=${token}`
  );

  if (budgetSettingsData.error != undefined) {
    LaunchBar.alert(budgetSettingsData.error);
  } else {
    LaunchBar.hide();
    const categoryData = HTTP.getJSON(
      `${apiBaseURL}/budgets/${budgetID}/categories?access_token=${token}`
    );
    const accountData = HTTP.getJSON(
      `${apiBaseURL}/budgets/${budgetID}/accounts?access_token=${token}`
    );

    File.writeJSON(
      budgetSettingsData.data,
      `${budgetDataDir}/budgetSettings.json`
    );

    File.writeJSON(categoryData.data, `${budgetDataDir}/categories.json`);
    File.writeJSON(accountData.data, `${budgetDataDir}/accounts.json`);

    LaunchBar.displayNotification({
      title: 'Success!',
      subtitle:
        'You have successfully updated categories, accounts and budget settings.',
    });
  }
}

function resetData() {
  var budgetData = HTTP.getJSON(`${apiBaseURL}/budgets/?access_token=${token}`);

  if (budgetData.error != undefined) {
    LaunchBar.alert(budgetData.error);
    return;
  }

  LaunchBar.hide();

  const budgets = budgetData.data.data.budgets;

  for (const budget of budgets) {
    const budgetID = budget.id;

    const budgetSettingsData = HTTP.getJSON(
      `${apiBaseURL}/budgets/${budgetID}/settings/?access_token=${token}`
    );

    const payeeData = HTTP.getJSON(
      `${apiBaseURL}/budgets/${budgetID}/payees?access_token=${token}`
    );
    const categoryData = HTTP.getJSON(
      `${apiBaseURL}/budgets/${budgetID}/categories?access_token=${token}`
    );
    const accountData = HTTP.getJSON(
      `${apiBaseURL}/budgets/${budgetID}/accounts?access_token=${token}`
    );

    File.createDirectory(`${Action.supportPath}/${budgetID}`);

    File.writeJSON(
      budgetSettingsData.data,
      `${Action.supportPath}/${budgetID}/budgetSettings.json`
    );
    File.writeJSON(
      categoryData.data,
      `${Action.supportPath}/${budgetID}/categories.json`
    );
    File.writeJSON(
      payeeData.data,
      `${Action.supportPath}/${budgetID}/payees.json`
    );
    File.writeJSON(
      accountData.data,
      `${Action.supportPath}/${budgetID}/accounts.json`
    );
  }

  LaunchBar.displayNotification({
    title: 'Success!',
    subtitle: 'You have successfully reset all your YNAB data.',
  });

  return 'success';
}
