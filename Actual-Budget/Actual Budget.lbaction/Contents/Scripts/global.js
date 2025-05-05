/* 
Actual Budget - Shared Functions
by Christian Bender (@ptujec)
2025-03-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const globalStorePath =
  '~/Library/Application Support/Actual/global-store.json';

// MARK: - Core Configuration and State Management

function getBudgetInfo() {
  const globalStore = File.readJSON(globalStorePath);
  const budgetDataPath = globalStore['document-dir'];
  const budgetID = globalStore.lastBudget;
  return {
    databasePath: `${budgetDataPath}/${budgetID}/db.sqlite`,
    budgetDataPath,
    budgetID,
  };
}

const recentPrefs = {
  get(key) {
    const { budgetID } = getBudgetInfo();
    const prefs = Action.preferences.recentTransactions || {};
    return (prefs[budgetID] || {})[key];
  },

  set(key, value) {
    const { budgetID } = getBudgetInfo();
    const allPrefs = Action.preferences.recentTransactions || {};

    allPrefs[budgetID] = {
      ...(allPrefs[budgetID] || {}),
      [key]: value,
    };

    Action.preferences.recentTransactions = allPrefs;
    return value;
  },
};

// MARK: - Database Operations

function getDatabaseData(
  customDatabasePath,
  customBudgetID,
  requireFullData = false
) {
  const { databasePath: defaultDatabasePath, budgetID: defaultBudgetID } =
    getBudgetInfo();
  const databasePath = customDatabasePath || defaultDatabasePath;
  const budgetID = customBudgetID || defaultBudgetID;
  const cacheFilePath = `${Action.supportPath}/db-cache-${budgetID}.json`;

  const fetchMode = requireFullData ? 'full' : 'basic';

  const result = LaunchBar.execute(
    '/bin/bash',
    './parseDataBase.sh',
    databasePath,
    cacheFilePath,
    fetchMode
  );

  if (!result) {
    LaunchBar.alert('Error reading database. No result.');
    return;
  }

  try {
    const data = JSON.parse(result);
    // LaunchBar.log(data.useCache); // TODO: Remove

    if (data.useCache) return File.readJSON(cacheFilePath);

    // For full data requests, completely replace the cache
    if (requireFullData) {
      File.writeJSON(data, cacheFilePath);
      return data;
    }

    // For partial updates, carefully merge with existing cache
    // TODO: Check
    let finalData = data;
    if (File.exists(cacheFilePath)) {
      const cachedData = File.readJSON(cacheFilePath);

      finalData = {
        ...cachedData,
        accounts: data.accounts,
        numberFormat: data.numberFormat,
        dateFormat: data.dateFormat,
        transactions: mergeTransactions(
          data.transactions,
          cachedData.transactions
        ),
        // Mark as not having full data anymore since historic data might be stale
        hasFullData: false,
      };
    }

    File.writeJSON(finalData, cacheFilePath);
    return finalData;
  } catch (error) {
    LaunchBar.alert('Error parsing database:', error.message);
    return;
  }
}

function mergeTransactions(newTransactions, existingTransactions = []) {
  return Object.values({
    ...Object.fromEntries(existingTransactions.map((t) => [t.id, t])),
    ...Object.fromEntries(newTransactions.map((t) => [t.id, t])),
  });
}

// MARK: - Budget Management

function showBudgets() {
  const { budgetDataPath, budgetID } = getBudgetInfo();
  const contents = File.getDirectoryContents(budgetDataPath);

  return contents
    .map((item) => {
      const badge = item === budgetID ? 'default' : undefined;
      const metadataPath = budgetDataPath + '/' + item + '/metadata.json';

      try {
        const metadata = File.readJSON(metadataPath);
        return {
          title: metadata.budgetName,
          subtitle: item === budgetID ? 'Current Budget' : undefined,
          icon: 'walletTemplate',
          badge,
          action: 'handleBudgetSelection',
          actionArgument: {
            databasePath: `${budgetDataPath}/${item}/db.sqlite`,
            budgetID: item,
          },
          actionReturnsItems: true,
          isDefaultBudget: item === budgetID,
        };
      } catch (error) {
        return {
          title: `Could not read metadata from ${metadataPath}`,
          icon: 'alert',
        };
      }
    })
    .sort((a, b) =>
      a.isDefaultBudget
        ? -1
        : b.isDefaultBudget
        ? 1
        : a.title.localeCompare(b.title)
    );
}

// MARK: - Formatting and Calculations

function formatAmount(amount, numberFormat) {
  const locales = {
    'dot-comma': 'de-DE',
    'comma-dot': 'en-US',
    'space-comma': 'sv-SE',
    'apostrophe-dot': 'it-CH',
    'comma-dot-in': 'en-IN',
  };

  const locale = locales[numberFormat] || 'en-US';
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount / 100);
}

function formatDate(dateString, format) {
  const date = new Date(
    String(dateString).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
  );

  return format
    .replace('yyyy', date.getFullYear())
    .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
    .replace('M', date.getMonth() + 1)
    .replace('dd', String(date.getDate()).padStart(2, '0'))
    .replace('d', date.getDate());
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

  const subtitle = isReconciliation
    ? `${formatDate(t.date, dateFormat)} (Reconciliation balance adjustment)`
    : t.category_name
    ? `${formatDate(t.date, dateFormat)} (${t.category_name})`
    : `${formatDate(t.date, dateFormat)}${t.notes ? ` - ${t.notes}` : ''}`;

  return {
    icon: getTransactionIcon(isReconciliation, isTransfer, t.amount),
    title,
    subtitle,
    alwaysShowsSubtitle: true,
    label: messageUrl ? '􀉣' : undefined,
    badge: t.account_name,
    action: 'open',
    actionArgument: messageUrl ?? '',
    actionRunsInBackground: true,
  };
}

// MARK: - Category Balance Calculation

// Helper function to pre-process transactions and budgets for faster category balance calculations
function preprocessCategoryData(transactions, zero_budgets) {
  const transactionsByCategory = new Map();
  const budgetsByCategory = new Map();

  // Group transactions by category and month
  for (const t of transactions) {
    if (!t.category_id || (t.is_parent && !t.is_child)) continue;

    const month = parseInt(String(t.date).substring(0, 6));
    const categoryId = t.category_id;

    if (!transactionsByCategory.has(categoryId)) {
      transactionsByCategory.set(categoryId, new Map());
    }
    const categoryMonths = transactionsByCategory.get(categoryId);

    if (!categoryMonths.has(month)) {
      categoryMonths.set(month, 0);
    }
    categoryMonths.set(month, categoryMonths.get(month) + t.amount);
  }

  // Group budgets by category
  for (const budget of zero_budgets) {
    if (!budgetsByCategory.has(budget.category)) {
      budgetsByCategory.set(budget.category, new Map());
    }
    budgetsByCategory.get(budget.category).set(budget.month, budget);
  }

  return { transactionsByCategory, budgetsByCategory };
}

function getCategoryBalance(categoryId, transactions, zero_budgets, category) {
  const currentDate = new Date();
  const currentMonth =
    currentDate.getFullYear() * 100 + (currentDate.getMonth() + 1);

  // Get cached data or create it if not exists
  if (!getCategoryBalance.cache) {
    getCategoryBalance.cache = preprocessCategoryData(
      transactions,
      zero_budgets
    );
  }

  // Special handling for income categories
  if (category.is_income) {
    const { transactionsByCategory } = getCategoryBalance.cache;

    // For income, only return current month's transactions
    const categoryTransactions = transactionsByCategory.get(categoryId);
    return categoryTransactions
      ? categoryTransactions.get(currentMonth) || 0
      : 0;
  }

  // Regular category handling
  const { transactionsByCategory, budgetsByCategory } =
    getCategoryBalance.cache;

  // Get category-specific data
  const categoryTransactions =
    transactionsByCategory.get(categoryId) || new Map();
  const categoryBudgets = budgetsByCategory.get(categoryId) || new Map();

  // Get all relevant months sorted
  const months = [
    ...new Set([...categoryTransactions.keys(), ...categoryBudgets.keys()]),
  ]
    .sort()
    .filter((month) => month <= currentMonth);

  let runningBalance = 0;

  // Process each month's budget and transactions
  for (const month of months) {
    const budget = categoryBudgets.get(month) || { budgeted: 0, carryover: 0 };
    const monthActivity = categoryTransactions.get(month) || 0;
    const monthBalance = budget.budgeted + monthActivity;

    if (runningBalance >= 0) {
      runningBalance += monthBalance;
    } else if (budget.carryover === 1) {
      runningBalance += monthBalance;
    } else {
      runningBalance = monthBalance;
    }

    // Only reset negative balance to 0 if it's not the current month and there's no carryover
    if (
      runningBalance < 0 &&
      budget.carryover !== 1 &&
      month !== currentMonth
    ) {
      runningBalance = 0;
    }
  }

  return runningBalance;
}
