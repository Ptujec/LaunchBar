/* 
Actual Budget Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('global.js');

function run() {
  if (LaunchBar.options.alternateKey) {
    return showBudgets();
  }

  const { databasePath } = getBudgetInfo();
  if (!File.exists(databasePath)) {
    return LaunchBar.alert('Database not found');
  }

  return LaunchBar.options.commandKey
    ? showCategories()
    : showAccountsAndTransactions();
}

function handleBudgetSelection(arg) {
  const { databasePath, budgetID } = arg;
  if (!File.exists(databasePath)) {
    return LaunchBar.alert('Database not found');
  }

  // Use the selected budget's data directly without changing the default
  return LaunchBar.options.commandKey
    ? showCategories(databasePath, budgetID)
    : showAccountsAndTransactions(databasePath, budgetID);
}

// MARK: - Account & Transactions Display

function showAccountsAndTransactions(customDatabasePath, customBudgetID) {
  const data = getDatabaseData(customDatabasePath, customBudgetID);
  if (!data) return [];

  const { accounts, transactions, numberFormat, dateFormat } = data;

  return [
    ...accounts
      .filter((account) => !account.closed && !account.offbudget)
      .map((account) => ({
        title: `${account.name}: ${formatAmount(
          account.balance,
          numberFormat
        )}`,
        action: 'open',
        actionArgument: '',
        actionRunsInBackground: true,
        icon: account.balance < 0 ? 'creditcardRed' : 'creditcardTemplate',
      })),

    ...transactions.map((t) => {
      const isTransfer = t.transfer_id != null;
      const isReconciliation =
        !t.payee_name && t.notes === 'Reconciliation balance adjustment';

      const title = [
        isTransfer ? 'Transfer' : t.payee_name,
        formatAmount(t.amount, numberFormat),
        !t.cleared && '(uncleared)',
      ]
        .filter(Boolean)
        .join(': ')
        .replace(': (', ' (');

      const formattedDate = formatDate(t.date, dateFormat);
      const subtitle = [
        formattedDate,
        isReconciliation
          ? '(Reconciliation balance adjustment)'
          : t.category_name && `(${t.category_name})`,
      ]
        .filter(Boolean)
        .join(' ');

      const icon = isReconciliation
        ? 'plusminusTemplate'
        : isTransfer
        ? t.amount < 0
          ? 'transferOutTemplate'
          : 'transferInTemplate'
        : t.amount >= 0
        ? 'incomingTemplate'
        : 'cartTemplate';

      const messageUrl = t.notes?.match(/message:\/\/[^\s]*/)?.[0];

      return {
        title,
        subtitle,
        badge: t.account_name,
        action: 'open',
        actionArgument: messageUrl ?? '',
        actionRunsInBackground: true,
        alwaysShowsSubtitle: true,
        icon,
        label: messageUrl ? '􀉣' : undefined,
      };
    }),
  ];
}

// MARK: - Category Display

function showCategories(customDatabasePath, customBudgetID) {
  const data = getDatabaseData(customDatabasePath, customBudgetID);
  if (!data || !data.categories || !data.categories.length) {
    return [{ title: 'No categories found', icon: 'alert' }];
  }

  const { categories, zero_budgets, transactions, numberFormat } = data;

  return categories
    .filter((cat) => cat.name !== 'Starting Balances')
    .map((cat) => {
      const budgeted =
        zero_budgets.find((b) => b.category === cat.id)?.budgeted || 0;
      const balance = budgeted + getCategoryBalance(cat.id, transactions);
      return {
        title: cat.name,
        subtitle: cat.group_name,
        alwaysShowsSubtitle: true,
        badge:
          balance === budgeted
            ? formatAmount(balance, numberFormat)
            : `${formatAmount(balance, numberFormat)} (${formatAmount(
                budgeted,
                numberFormat
              )})`,
        icon: balance < 0 ? 'categoryRed' : 'categoryTemplate',
        action: 'open',
        actionArgument: '',
        balance,
      };
    })
    .sort((a, b) => (a.balance < 0 ? -1 : 1) - (b.balance < 0 ? -1 : 1));
}

// MARK: - Interface Item Actions

function open(arg) {
  LaunchBar.hide();
  if (arg.startsWith('message://')) return LaunchBar.openURL(arg);
  return LaunchBar.openURL(File.fileURLForPath('/Applications/Actual.app'));
}
