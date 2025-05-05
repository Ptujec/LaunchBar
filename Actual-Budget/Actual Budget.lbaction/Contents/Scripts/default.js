/* 
Actual Budget Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://actualbudget.org/docs/budgeting/
- https://github.com/actualbudget/actual/tree/master/packages/loot-core (The core application that runs on any platform)
)
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

function getTransactionIcon(isReconciliation, isTransfer, amount) {
  if (isReconciliation) return 'plusminusTemplate';
  if (isTransfer)
    return amount < 0 ? 'transferOutTemplate' : 'transferInTemplate';
  return amount >= 0 ? 'incomingTemplate' : 'cartTemplate';
}

// MARK: - Account & Transactions Display

function showAccountsAndTransactions(customDatabasePath, customBudgetID) {
  const data = getDatabaseData(customDatabasePath, customBudgetID, false);
  if (!data) return [];

  const { accounts, transactions, numberFormat, dateFormat } = data;

  const accountResults = accounts
    .filter((account) => !account.closed && !account.offbudget)
    .map((account) => ({
      title: `${account.name}: ${formatAmount(account.balance, numberFormat)}`,
      action: 'open', // TODO: implement transaction details
      actionArgument: '', // TODO: implement transaction details
      actionRunsInBackground: true,
      icon: account.balance < 0 ? 'creditcardRed' : 'creditcardTemplate',
    }));

  const recentTransactions = transactions
    .slice(0, 150)
    .map((t) => formatTransaction(t, numberFormat, dateFormat));

  return [...accountResults, ...recentTransactions];
}

// MARK: - Category Display

function showCategories(customDatabasePath, customBudgetID) {
  const data = getDatabaseData(customDatabasePath, customBudgetID, true);
  if (!data || !data.categories || !data.categories.length) {
    return [{ title: 'No categories found', icon: 'alert' }];
  }

  const {
    categories,
    zero_budgets,
    transactions,
    numberFormat,
    dateFormat,
    notes,
  } = data;

  const currentDate = new Date();
  const currentMonth =
    currentDate.getFullYear() * 100 + (currentDate.getMonth() + 1); // YYYYMM

  const currentMonthTransactions = transactions.filter(
    (t) => Math.floor(t.date / 100) === currentMonth
  );

  return categories
    .filter((cat) => cat.name !== 'Starting Balances')
    .map((cat) => {
      const balance = getCategoryBalance(
        cat.id,
        transactions,
        zero_budgets,
        cat
      );

      const budgetData = zero_budgets.find(
        (b) => b.month === currentMonth && b.category === cat.id
      ) || { budgeted: 0, carryover: 0 }; // budgeted is amount, carryover is 1 or 0

      const categoryTransactions = currentMonthTransactions.filter(
        (t) => t.category_id === cat.id
      );

      const netFlow = categoryTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );

      const noteText = notes?.find((note) => note.id === cat.id)?.note;

      const displayCarryover = budgetData?.carryover === 1 ? '→ ' : '';

      const displayBalance =
        balance !== 0 ? `: ${formatAmount(balance, numberFormat)}` : '';

      const displayNetFlow =
        netFlow !== 0 && netFlow !== balance
          ? `Flow: ${formatAmount(netFlow, numberFormat)}`
          : undefined;

      const displayBudgeted =
        budgetData.budgeted > 0
          ? `Budgeted: ${formatAmount(budgetData.budgeted, numberFormat)}`
          : 'No Budget';

      const subtitle =
        cat.group_is_income === 0
          ? displayCarryover +
            [displayNetFlow, displayBudgeted].filter(Boolean).join(' ⋅ ')
          : undefined;

      const icon =
        balance < 0
          ? 'categoryRed'
          : balance === 0
          ? 'categoryGreyTemplate'
          : 'categoryTemplate';

      return {
        title: `${cat.name}${displayBalance}`,
        subtitle,
        alwaysShowsSubtitle: true,
        label: cat.group_name,
        icon,
        action: 'handleCategoryAction',
        actionArgument: {
          categoryTransactions,
          numberFormat,
          dateFormat,
          noteText,
        },
        actionReturnsItems: categoryTransactions.length > 0 || noteText != null,
        balance,
      };
    })
    .sort((a, b) => (a.balance < 0 ? -1 : 1) - (b.balance < 0 ? -1 : 1));
}

// MARK: - Item Actions

function handleCategoryAction({
  categoryTransactions,
  numberFormat,
  dateFormat,
  noteText,
}) {
  if (
    LaunchBar.options.commandKey ||
    (categoryTransactions.length === 0 && !noteText)
  ) {
    LaunchBar.hide();
    return LaunchBar.openURL(File.fileURLForPath('/Applications/Actual.app'));
  }

  const noteItem = noteText ? [{ title: noteText, icon: 'noteTemplate' }] : [];

  const transactionItems = categoryTransactions.map((t) =>
    formatTransaction(t, numberFormat, dateFormat)
  );

  return [...noteItem, ...transactionItems];
}

// TODO: turn into handle transaction actions … show details e.g. notes … or/and enable browsing
function open(arg) {
  LaunchBar.hide();
  if (arg.startsWith('message://')) return LaunchBar.openURL(arg);
  return LaunchBar.openURL(File.fileURLForPath('/Applications/Actual.app'));
}
