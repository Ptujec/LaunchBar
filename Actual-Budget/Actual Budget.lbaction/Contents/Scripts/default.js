/*
Actual Budget Action for LaunchBar
by Christian Bender (@ptujec)
2026-03-21

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://actualbudget.org/docs/budgeting/
- https://github.com/actualbudget/actual/tree/master/packages/loot-core (The core application that runs on any platform)
)
*/

include('global.js');

function run(argument) {
  if (argument) return search(argument);

  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(File.fileURLForPath('/Applications/Actual.app'));
    return;
  }

  if (LaunchBar.options.controlKey) {
    return showBudgets();
  }

  const { databasePath } = getBudgetInfo();
  if (!File.exists(databasePath)) {
    return LaunchBar.alert('Database not found');
  }

  if (LaunchBar.options.alternateKey) return showPayees();

  return LaunchBar.options.shiftKey
    ? showCategories()
    : showAccountsAndTransactions();
}

// MARK: - Search

function search(argument) {
  // Auto complete/remove quotations
  if (argument === '"') addEndingQuote();
  if (argument === '""') return;

  if (argument.startsWith('"') && !argument.endsWith('"')) {
    removeLeadingQuote();
  } else if (!argument.startsWith('"') && argument.endsWith('"')) {
    addLeadingQuote();
  }

  const data = getDatabaseData(null, null, true);
  if (!data) return [];

  const {
    categories,
    payees,
    transactions,
    numberFormat,
    dateFormat,
    zero_budgets,
    notes,
  } = data;

  // Normalize search query for case-insensitive matching
  const trimmedArgument = argument.trim();
  const isExactPhrase =
    trimmedArgument.startsWith('"') && trimmedArgument.endsWith('"');
  const query = isExactPhrase
    ? trimmedArgument.slice(1, -1).toLowerCase()
    : trimmedArgument.toLowerCase();

  // Search categories
  const matchedCategories = categories
    ? categories
        .filter(
          (cat) =>
            (matchesQuery(cat.name, query, isExactPhrase) ||
              matchesQuery(cat.group_name, query, isExactPhrase)) &&
            cat.name !== 'Starting Balances',
        )
        .map((cat) => {
          const balance = getCategoryBalance(
            cat.id,
            transactions,
            zero_budgets,
            cat,
          );
          const budgetData = zero_budgets.find(
            (b) =>
              b.month ===
                new Date().getFullYear() * 100 + (new Date().getMonth() + 1) &&
              b.category === cat.id,
          ) || { budgeted: 0, carryover: 0 };

          const categoryTransactions = transactions.filter(
            (t) =>
              t.category_id === cat.id &&
              Math.floor(t.date / 100) ===
                new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
          );

          const netFlow = categoryTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
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
              categoryId: cat.id,
              categoryTransactions,
              numberFormat,
              dateFormat,
              noteText,
              fromSearch: true,
            },
            actionReturnsItems:
              categoryTransactions.length > 0 || noteText != null,
          };
        })
    : [];

  // Search payees
  const matchedPayees = payees
    ? payees
        .filter((payee) => matchesQuery(payee.name, query, isExactPhrase))
        .map((payee) => ({
          title: payee.transfer_acct ? `Transfer: ${payee.name}` : payee.name,
          icon: 'payeeTemplate',
          action: 'showPayeeTransactions',
          actionArgument: {
            payeeName: payee.id,
            fromSearch: true,
          },
          actionReturnsItems: true,
        }))
    : [];

  // Search notes (return transactions)
  const noteMatches = transactions
    .filter((t) => !t.is_child)
    .filter((t) =>
      matchesQuery(t.notes?.replace(urlRegex, '').trim(), query, isExactPhrase),
    )
    .slice(0, 50)
    .map((t) => formatTransaction(t, numberFormat, dateFormat, transactions));

  const results = [...matchedCategories, ...matchedPayees, ...noteMatches];

  return results.length > 0
    ? results
    : { title: `No matches found for "${argument}"`, icon: 'alert' };
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
    .map((t) =>
      formatTransaction(
        t,
        numberFormat,
        dateFormat,
        transactions,
        undefined,
        customDatabasePath,
        customBudgetID,
      ),
    );

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
    requireFullData: LaunchBar.options.alternateKey,
  });

  if (!data) return [];

  const { transactions, numberFormat, dateFormat } = data;

  const accountTransactions = transactions
    .filter((t) => t.account_id === accountId)
    .slice(0, LaunchBar.options.alternateKey ? undefined : 50)
    .map((t) =>
      formatTransaction(
        t,
        numberFormat,
        dateFormat,
        transactions,
        accountId,
        customDatabasePath,
        customBudgetID,
      ),
    );

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
    (t) => Math.floor(t.date / 100) === currentMonth,
  );

  return categories
    .filter((cat) => cat.name !== 'Starting Balances')
    .map((cat) => {
      const balance = getCategoryBalance(
        cat.id,
        transactions,
        zero_budgets,
        cat,
      );

      const budgetData = zero_budgets.find(
        (b) => b.month === currentMonth && b.category === cat.id,
      ) || { budgeted: 0, carryover: 0 }; // budgeted is amount, carryover is 1 or 0

      const categoryTransactions = currentMonthTransactions.filter(
        (t) => t.category_id === cat.id,
      );

      const netFlow = categoryTransactions.reduce(
        (sum, t) => sum + t.amount,
        0,
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
          categoryId: cat.id,
          categoryTransactions,
          numberFormat,
          dateFormat,
          noteText,
          customDatabasePath,
          customBudgetID,
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
  categoryId,
  categoryTransactions,
  numberFormat,
  dateFormat,
  noteText,
  fromSearch,
  customDatabasePath,
  customBudgetID,
}) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL(actualFileURL);
    return;
  }

  if (LaunchBar.options.alternateKey || fromSearch) {
    return showCategoryTransactions({
      categoryId,
      fromSearch,
      customDatabasePath,
      customBudgetID,
    });
  }

  const noteItem = noteText ? [{ title: noteText, icon: 'noteTemplate' }] : [];

  const transactionItems = categoryTransactions.map((t) =>
    formatTransaction(
      t,
      numberFormat,
      dateFormat,
      categoryTransactions,
      undefined,
      customDatabasePath,
      customBudgetID,
    ),
  );

  return [...noteItem, ...transactionItems];
}

function handleTransactionAction({
  t,
  formattedAmount,
  formattedDate,
  url,
  customDatabasePath = null,
  customBudgetID = null,
}) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL(
      url && !LaunchBar.options.alternateKey ? url : actualFileURL,
    );
    return;
  }

  // For transfers, show source account, target account, amount and date
  if (t.transfer_id) {
    const data = getCachedDatabaseData({
      customDatabasePath,
      customBudgetID,
      checkForEntity: { id: t.transfer_id, field: 'id' },
    });

    if (!data) return [];

    const { transactions } = data;
    const relatedTransfer = transactions.find((tr) => tr.id === t.transfer_id);

    if (!relatedTransfer) return [];

    const sourceAccount =
      t.amount < 0 ? t.account_name : relatedTransfer.account_name;
    const targetAccount =
      t.amount < 0 ? relatedTransfer.account_name : t.account_name;

    return [
      {
        title: `${sourceAccount} →`,
        icon: 'creditcardTemplate',
        action: 'showAccountTransactions',
        actionArgument: {
          accountId: t.amount < 0 ? t.account_id : relatedTransfer.account_id,
          customDatabasePath,
          customBudgetID,
        },
        actionReturnsItems: true,
      },
      {
        title: targetAccount,
        icon: 'creditcardTemplate',
        action: 'showAccountTransactions',
        actionArgument: {
          accountId: t.amount < 0 ? relatedTransfer.account_id : t.account_id,
          customDatabasePath,
          customBudgetID,
        },
        actionReturnsItems: true,
      },
      {
        title: formattedAmount.replace('-', ''),
        icon: 'transferTemplate',
      },
      {
        title: formattedDate,
        icon: 'calTemplate',
        action: 'showTransactionsByDate',
        actionArgument: {
          date: t.date,
          customDatabasePath,
          customBudgetID,
        },
        actionReturnsItems: true,
      },
    ];
  }

  if (t.is_parent) {
    const data = getCachedDatabaseData({
      customDatabasePath,
      customBudgetID,
      checkForEntity: { id: t.id, field: 'parent_id' },
    });

    if (!data) return [];

    const { transactions, numberFormat, dateFormat } = data;
    const childTransactions = transactions
      .filter((ct) => ct.parent_id === t.id)
      .map((ct) =>
        formatTransaction(
          ct,
          numberFormat,
          dateFormat,
          transactions,
          undefined,
          customDatabasePath,
          customBudgetID,
        ),
      );

    return childTransactions.length > 0
      ? childTransactions
      : [{ title: 'No child transactions found', icon: 'alert' }];
  }

  const displayNotes = t.notes ? t.notes.replace(urlRegex, '').trim() : '';

  return [
    t.payee_name
      ? {
          title: t.payee_name,
          icon: 'payeeTemplate',
          action: 'showPayeeTransactions',
          actionArgument: {
            payeeName: t.payee_id,
            customDatabasePath,
            customBudgetID,
          },
          actionReturnsItems: true,
        }
      : undefined,
    t.category_name
      ? {
          title: t.category_name,
          icon: 'categoryTemplate',
          action: 'showCategoryTransactions',
          actionArgument: {
            categoryId: t.category_id,
            customDatabasePath,
            customBudgetID,
          },
          actionReturnsItems: true,
        }
      : undefined,
    {
      title: t.account_name,
      icon: 'creditcardTemplate',
      action: 'showAccountTransactions',
      actionArgument: {
        accountId: t.account_id,
        customDatabasePath,
        customBudgetID,
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
        customDatabasePath,
        customBudgetID,
      },
      actionReturnsItems: true,
    },
    {
      title: t.notes && !displayNotes ? t.notes : displayNotes,
      icon: 'noteTemplate',
      url,
      label: url ? '􀉣' : undefined,
    },
  ];
}

// MARK: - Payee Transactions Display

function showPayeeTransactions({
  payeeName: payeeId,
  fromSearch = false,
  customDatabasePath = null,
  customBudgetID = null,
}) {
  const data = getCachedDatabaseData({
    customDatabasePath,
    customBudgetID,
    checkForEntity: { id: payeeId, field: 'payee_id' },
    requireFullData: fromSearch || LaunchBar.options.alternateKey,
  });

  if (!data) return [];

  const { transactions, numberFormat, dateFormat } = data;

  const payeeTransactions = transactions
    .filter((t) => t.payee_id === payeeId)
    .slice(0, LaunchBar.options.alternateKey || fromSearch ? undefined : 50) // NOTE: adjust to show all for fromSearch?
    .map((t) =>
      formatTransaction(
        t,
        numberFormat,
        dateFormat,
        transactions,
        undefined,
        customDatabasePath,
        customBudgetID,
      ),
    );

  return payeeTransactions.length > 0
    ? payeeTransactions
    : [{ title: 'No transactions found', icon: 'alert' }];
}

function showTransactionsByDate({
  date,
  customDatabasePath = null,
  customBudgetID = null,
}) {
  const data = getCachedDatabaseData({
    customDatabasePath,
    customBudgetID,
    checkForEntity: { id: date, field: 'date' },
  });

  if (!data) return [];

  const { transactions, numberFormat, dateFormat } = data;
  const dateTransactions = transactions
    .filter((t) => t.date === date)
    .filter((t) => !t.is_child)
    .filter((t) => !t.transfer_id || (t.transfer_id && t.amount < 0))
    .map((t) =>
      formatTransaction(
        t,
        numberFormat,
        dateFormat,
        transactions,
        undefined,
        customDatabasePath,
        customBudgetID,
      ),
    );

  return dateTransactions.length > 0
    ? dateTransactions
    : [{ title: 'No transactions found for this date', icon: 'alert' }];
}

function showCategoryTransactions({
  categoryId,
  fromSearch = false,
  customDatabasePath = null,
  customBudgetID = null,
}) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL(actualFileURL);
    return;
  }

  const data = getCachedDatabaseData({
    customDatabasePath,
    customBudgetID,
    checkForEntity: { id: categoryId, field: 'category_id' },
    requireFullData: fromSearch || LaunchBar.options.alternateKey,
  });

  if (!data) return [];

  const { transactions, numberFormat, dateFormat } = data;

  const categoryTransactions = transactions
    .filter((t) => t.category_id === categoryId)
    .slice(0, LaunchBar.options.alternateKey || fromSearch ? undefined : 50) // NOTE: adjust to show all for fromSearch?
    .map((t) =>
      formatTransaction(
        t,
        numberFormat,
        dateFormat,
        transactions,
        undefined,
        customDatabasePath,
        customBudgetID,
      ),
    );

  return categoryTransactions.length > 0
    ? categoryTransactions
    : [{ title: 'No transactions found', icon: 'alert' }];
}

// MARK: - Transaction Formatting

function createTransferMap(transactions) {
  return transactions.reduce((map, t) => {
    if (t.transfer_id) {
      map[t.id] = t;
    }
    return map;
  }, {});
}

function formatTransfer(sourceAccount, targetAccount) {
  return `${sourceAccount} → ${targetAccount}`;
}

function formatTransaction(
  t,
  numberFormat,
  dateFormat,
  transactions,
  accountId,
  customDatabasePath = null,
  customBudgetID = null,
) {
  const isTransfer = t.transfer_id != null;
  const isReconciliation =
    !t.payee_name && t.notes?.startsWith('Reconciliation balance adjustment');
  const formattedAmount = formatAmount(t.amount, numberFormat);

  const url = t.notes?.match(urlRegex)?.[0];

  let title = [
    isTransfer ? 'Transfer' : t.payee_name,
    formattedAmount,
    !t.cleared && '(uncleared)',
  ]
    .filter(Boolean)
    .join(t.cleared ? ': ' : ' ');

  let icon = getTransactionIcon(isReconciliation, t.amount);
  let badge = t.account_name;

  // Handle transfer display
  if (isTransfer && transactions) {
    // Create transfer map if it doesn't exist
    if (!transactions._transferMap) {
      transactions._transferMap = createTransferMap(transactions);
    }
    const relatedTransfer = transactions._transferMap[t.transfer_id];
    if (relatedTransfer) {
      const sourceAccount =
        t.amount < 0 ? t.account_name : relatedTransfer.account_name;
      const targetAccount =
        t.amount < 0 ? relatedTransfer.account_name : t.account_name;
      badge = formatTransfer(sourceAccount, targetAccount);
      icon = 'transferTemplate';
      if (t.amount < 0) {
        title = title.replace('-', '');
      }
    }
  }

  const formattedDate = formatDate(t.date, dateFormat);

  let subtitle = t.is_parent
    ? `${formattedDate} (Split)`
    : t.category_name
      ? `${formattedDate} ⋅ ${t.category_name}`
      : formattedDate;

  if (t.notes && subtitle.length < 40) {
    const displayNotes = t.notes.replace(urlRegex, '').trim();
    const remainingSpace = 48 - subtitle.length - 3; // 3 for " ⋅ "
    const truncatedNotes =
      displayNotes.length > remainingSpace
        ? displayNotes.slice(0, remainingSpace - 1) + '…'
        : displayNotes;
    subtitle += truncatedNotes.trim() ? ` ⋅ ${truncatedNotes}` : '';
  }

  return {
    icon,
    title,
    subtitle,
    alwaysShowsSubtitle: true,
    label: t.is_parent ? '􀙠' : url ? '􀉣' : undefined,
    badge,
    action: 'handleTransactionAction',
    actionArgument: {
      t,
      formattedAmount,
      formattedDate,
      url,
      customDatabasePath,
      customBudgetID,
    },
    actionReturnsItems: true,
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
