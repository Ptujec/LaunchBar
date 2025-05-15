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

  if (LaunchBar.options.shiftKey) return showPayees();

  return LaunchBar.options.commandKey
    ? showCategories()
    : showAccountsAndTransactions();
}

// MARK: - Budget Selection (Optional)

function handleBudgetSelection(arg) {
  const { databasePath, budgetID } = arg;
  if (!File.exists(databasePath)) {
    return LaunchBar.alert('Database not found');
  }

  if (LaunchBar.options.shiftKey) return showPayees(databasePath, budgetID);

  return LaunchBar.options.commandKey
    ? showCategories(databasePath, budgetID)
    : showAccountsAndTransactions(databasePath, budgetID);
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
      icon: account.balance < 0 ? 'creditcardRed' : 'creditcardTemplate',
      action: 'showAccountTransactions',
      actionArgument: {
        accountId: account.id,
        customDatabasePath,
        customBudgetID,
      },
      actionReturnsItems: true,
    }));

  const recentTransactions = transactions
    .filter((t) => !t.is_child)
    .filter((t) => !t.transfer_id || (t.transfer_id && t.amount < 0))
    .slice(0, 150)
    .map((t) => {
      const item = formatTransaction(t, numberFormat, dateFormat);

      if (t.transfer_id) {
        const relatedTransfer = transactions.find(
          (tr) => tr.id === t.transfer_id
        );
        if (relatedTransfer) {
          item.badge = `${t.account_name} → ${relatedTransfer.account_name}`;
          item.icon = 'transferTemplate';
          item.title = item.title.replace('-', '');
        }
      }

      return item;
    });

  return [...accountResults, ...recentTransactions];
}

// MARK: - Account Actions

function showAccountTransactions({
  accountId,
  customDatabasePath,
  customBudgetID,
}) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL(actualFileURL);
    return;
  }

  const data = getCachedDatabaseData({
    customDatabasePath,
    customBudgetID,
    checkForEntity: { id: accountId, field: 'account_id' },
    alternateKeyPressed: LaunchBar.options.alternateKey,
  });

  if (!data) return [];

  const { transactions, numberFormat, dateFormat } = data;

  const accountTransactions = transactions
    .filter((t) => t.account_id === accountId)
    .slice(0, LaunchBar.options.alternateKey ? undefined : 50)
    .map((t) => formatTransaction(t, numberFormat, dateFormat));

  return accountTransactions.length > 0
    ? accountTransactions
    : [{ title: 'No transactions found', icon: 'alert' }];
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
            [displayNetFlow, displayBudgeted].filter(Boolean).join(' ⋅ ')
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

// MARK: - Payee Display

function showPayees(customDatabasePath, customBudgetID) {
  const data = getDatabaseData(customDatabasePath, customBudgetID, true);
  if (!data || !data.payees || !data.payees.length) {
    return [{ title: 'No payees found', icon: 'alert' }];
  }

  return data.payees.map((payee) => ({
    title: payee.transfer_acct ? `Transfer: ${payee.name}` : payee.name,
    icon: 'payeeTemplate',
    action: 'showPayeeTransactions',
    actionArgument: {
      payeeName: payee.id,
      customDatabasePath,
      customBudgetID,
    },
    actionReturnsItems: true,
  }));
}

// MARK: - Item Actions

function handleCategoryAction({
  categoryTransactions,
  numberFormat,
  dateFormat,
  noteText,
}) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL(actualFileURL);
    return;
  }

  const noteItem = noteText ? [{ title: noteText, icon: 'noteTemplate' }] : [];

  const transactionItems = categoryTransactions.map((t) =>
    formatTransaction(t, numberFormat, dateFormat)
  );

  return [...noteItem, ...transactionItems];
}

function handleTransactionAction({
  t,
  formattedAmount,
  formattedDate,
  messageUrl,
}) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(
      messageUrl && !LaunchBar.options.alternateKey ? messageUrl : actualFileURL
    );
    return;
  }

  if (t.transfer_id) return;

  if (t.is_parent) {
    const data = getCachedDatabaseData({
      checkForEntity: { id: t.id, field: 'parent_id' },
    });

    if (!data) return [];

    const { transactions, numberFormat, dateFormat } = data;
    const childTransactions = transactions
      .filter((ct) => ct.parent_id === t.id)
      .map((ct) => formatTransaction(ct, numberFormat, dateFormat));

    return childTransactions.length > 0
      ? childTransactions
      : [{ title: 'No child transactions found', icon: 'alert' }];
  }

  const displayNotes = t.notes
    ? t.notes.replace(/message:\/\/[^\s]*/, '').trim()
    : '';

  return [
    {
      title: t.payee_name,
      icon: 'payeeTemplate',
      action: 'showPayeeTransactions',
      actionArgument: {
        payeeName: t.payee_id,
      },
      actionReturnsItems: true,
    },
    {
      title: t.category_name,
      icon: 'categoryTemplate',
      action: 'showCategoryTransactions',
      actionArgument: {
        categoryId: t.category_id,
      },
      actionReturnsItems: true,
    },
    {
      title: t.account_name,
      icon: 'creditcardTemplate',
      action: 'showAccountTransactions',
      actionArgument: {
        accountId: t.account_id,
      },
      actionReturnsItems: true,
    },
    {
      title: formattedAmount,
      icon: 'cartTemplate',
    },
    {
      title: formattedDate,
      icon: 'calTemplate',
      action: 'showTransactionsByDate',
      actionArgument: {
        date: t.date,
      },
      actionReturnsItems: true,
    },
    {
      title: t.notes && !displayNotes ? '(Mail URL)' : displayNotes,
      icon: 'noteTemplate',
      url: messageUrl ? messageUrl : undefined,
      label: messageUrl ? '􀉣' : undefined,
    },
  ];
}

// MARK: - Payee Transactions Display

function showPayeeTransactions(
  { payeeName: payeeId },
  customDatabasePath,
  customBudgetID
) {
  const data = getCachedDatabaseData({
    customDatabasePath,
    customBudgetID,
    checkForEntity: { id: payeeId, field: 'payee_id' },
    alternateKeyPressed: LaunchBar.options.alternateKey,
  });

  if (!data) return [];

  const { transactions, numberFormat, dateFormat } = data;

  const payeeTransactions = transactions
    .filter((t) => t.payee_id === payeeId)
    .slice(0, LaunchBar.options.alternateKey ? undefined : 50)
    .map((t) => formatTransaction(t, numberFormat, dateFormat));

  return payeeTransactions.length > 0
    ? payeeTransactions
    : [{ title: 'No transactions found', icon: 'alert' }];
}

function showTransactionsByDate({ date, customDatabasePath, customBudgetID }) {
  const data = getCachedDatabaseData({
    customDatabasePath,
    customBudgetID,
  });

  if (!data) return [];

  const { transactions, numberFormat, dateFormat } = data;
  const dateTransactions = transactions
    .filter((t) => t.date === date)
    .map((t) => formatTransaction(t, numberFormat, dateFormat));

  return dateTransactions.length > 0
    ? dateTransactions
    : [{ title: 'No transactions found for this date', icon: 'alert' }];
}

function showCategoryTransactions({ categoryId }) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL(actualFileURL);
    return;
  }

  const data = getCachedDatabaseData({
    checkForEntity: { id: categoryId, field: 'category_id' },
    alternateKeyPressed: LaunchBar.options.alternateKey,
  });

  if (!data) return [];

  const { transactions, numberFormat, dateFormat } = data;

  const categoryTransactions = transactions
    .filter((t) => t.category_id === categoryId)
    .slice(0, LaunchBar.options.alternateKey ? undefined : 50)
    .map((t) => formatTransaction(t, numberFormat, dateFormat));

  return categoryTransactions.length > 0
    ? categoryTransactions
    : [{ title: 'No transactions found', icon: 'alert' }];
}

// MARK: - Transaction Formatting

function formatTransaction(t, numberFormat, dateFormat) {
  const isTransfer = t.transfer_id != null;
  const isReconciliation =
    !t.payee_name && t.notes === 'Reconciliation balance adjustment';
  const formattedAmount = formatAmount(t.amount, numberFormat);

  const messageUrl = t.notes?.match(/message:\/\/[^\s]*/)?.[0];

  const title = [
    isTransfer ? 'Transfer' : t.payee_name,
    formattedAmount,
    !t.cleared && '(uncleared)',
  ]
    .filter(Boolean)
    .join(t.cleared ? ': ' : ' ');

  const formattedDate = formatDate(t.date, dateFormat);

  let subtitle = t.is_parent
    ? `${formattedDate} (Split)`
    : t.category_name
    ? `${formattedDate} ⋅ ${t.category_name}`
    : formattedDate;

  if (t.notes && subtitle.length < 40) {
    const displayNotes = t.notes
      ? t.notes.replace(/message:\/\/[^\s]*/, '')
      : '';
    const remainingSpace = 48 - subtitle.length - 3; // 3 for " ⋅ "
    const truncatedNotes =
      displayNotes.length > remainingSpace
        ? displayNotes.slice(0, remainingSpace - 1) + '…'
        : displayNotes;
    subtitle += truncatedNotes.trim() ? ` ⋅ ${truncatedNotes}` : '';
  }

  return {
    icon: getTransactionIcon(isReconciliation, t.amount),
    title,
    subtitle,
    alwaysShowsSubtitle: true,
    label: t.is_parent ? '􀙠' : messageUrl ? '􀉣' : undefined,
    badge: t.account_name,
    action: 'handleTransactionAction',
    actionArgument: {
      t,
      formattedAmount,
      formattedDate,
      messageUrl,
    },
    actionReturnsItems: isTransfer ? false : true,
    transferItem: isTransfer
      ? {
          id: t.id,
          transfer_id: t.transfer_id,
          amount: t.amount,
          account_name: t.account_name,
        }
      : undefined,
  };
}

function getTransactionIcon(isReconciliation, amount) {
  if (isReconciliation) return 'plusminusTemplate';
  return amount >= 0 ? 'incomingTemplate' : 'cartTemplate';
}

// MARK: - Helper Functions

function getRecentTransactions(transactions, limit = 150) {
  return transactions.filter((t) => !t.is_child).slice(0, limit);
}
