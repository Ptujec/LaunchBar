/*
Actual Budget - Shared Functions
by Christian Bender (@ptujec)
2025-03-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const globalStorePath =
  '~/Library/Application Support/Actual/global-store.json';

const actualFileURL = File.fileURLForPath('/Applications/Actual.app');

const addActionExists = File.exists(
  '~/Library/Application Support/LaunchBar/Actions/ActualAddTransaction.lbaction'
);

const fullDataActionSupportPath = addActionExists
  ? `${LaunchBar.homeDirectory}/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.ActualAddTransaction`
  : Action.supportPath;

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

  const basicCacheFilePath = `${Action.supportPath}/db-cache-${budgetID}-basic.json`;
  const fullCacheFilePath = `${fullDataActionSupportPath}/db-cache-${budgetID}.json`;
  const cacheFilePath = requireFullData
    ? fullCacheFilePath
    : basicCacheFilePath;

  // Check if cache is valid
  if (File.exists(cacheFilePath)) {
    const dbModDate = File.modificationDate(databasePath);
    const cacheModDate = File.modificationDate(cacheFilePath);

    // If database is NOT newer than cache, check if we have required data
    if (dbModDate < cacheModDate) {
      if (requireFullData) {
        const cachedData = File.readJSON(cacheFilePath);
        if (cachedData.hasFullData) {
          return cachedData;
        }
      } else {
        return File.readJSON(cacheFilePath);
      }
    }
  }

  const fetchMode = requireFullData ? 'full' : 'basic';

  const result = LaunchBar.execute(
    '/bin/bash',
    './parseDataBase.sh',
    databasePath,
    fetchMode
  );

  if (!result) {
    LaunchBar.alert('Error reading database. No result.');
    return;
  }

  try {
    const data = JSON.parse(result);
    if (!requireFullData) {
      const finalData = createBasicData(data);
      File.writeJSON(finalData, basicCacheFilePath);
      return finalData;
    }
    File.writeJSON(data, fullCacheFilePath);
    return data;
  } catch (error) {
    LaunchBar.alert('Error parsing database:', error.message);
    return;
  }
}

// MARK: - Cache Management

function createBasicData(data) {
  return {
    accounts: data.accounts,
    transactions: getRecentTransactions(data.transactions),
    numberFormat: data.numberFormat,
    dateFormat: data.dateFormat,
    hasFullData: false,
  };
}

function getCachedDatabaseData(options = {}) {
  const {
    customDatabasePath = null,
    customBudgetID = null,
    requireFullData = false,
    checkForEntity = null, // { id: string, field: string } to check if entity exists in basic data
    alternateKeyPressed = false,
  } = options;

  const { budgetID: defaultBudgetID } = getBudgetInfo();
  const budgetID = customBudgetID || defaultBudgetID;
  const basicCacheFilePath = `${Action.supportPath}/db-cache-${budgetID}-basic.json`;
  const fullCacheFilePath = `${fullDataActionSupportPath}/db-cache-${budgetID}.json`;

  let data;

  if (File.exists(basicCacheFilePath)) {
    data = File.readJSON(basicCacheFilePath);

    const needsFullData =
      alternateKeyPressed ||
      requireFullData ||
      (checkForEntity &&
        !data.transactions.some(
          (t) => t[checkForEntity.field] === checkForEntity.id
        ));

    if (needsFullData) {
      if (File.exists(fullCacheFilePath)) {
        data = File.readJSON(fullCacheFilePath);
        const basicData = createBasicData(data);
        File.writeJSON(basicData, basicCacheFilePath);
      } else {
        data = getDatabaseData(customDatabasePath, customBudgetID, true);
      }
    }
  } else if (File.exists(fullCacheFilePath)) {
    data = File.readJSON(fullCacheFilePath);
    const basicData = createBasicData(data);
    File.writeJSON(basicData, basicCacheFilePath);
  } else {
    data = getDatabaseData(customDatabasePath, customBudgetID, requireFullData);
  }

  return data;
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

// MARK: - Category Balance Calculation

function preprocessCategoryData(transactions, zero_budgets) {
  const transactionsByCategory = new Map();
  const budgetsByCategory = new Map();

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

  if (!getCategoryBalance.cache) {
    getCategoryBalance.cache = preprocessCategoryData(
      transactions,
      zero_budgets
    );
  }

  if (category.is_income) {
    const { transactionsByCategory } = getCategoryBalance.cache;

    const categoryTransactions = transactionsByCategory.get(categoryId);
    return categoryTransactions
      ? categoryTransactions.get(currentMonth) || 0
      : 0;
  }

  const { transactionsByCategory, budgetsByCategory } =
    getCategoryBalance.cache;

  const categoryTransactions =
    transactionsByCategory.get(categoryId) || new Map();
  const categoryBudgets = budgetsByCategory.get(categoryId) || new Map();

  const months = [
    ...new Set([...categoryTransactions.keys(), ...categoryBudgets.keys()]),
  ]
    .sort()
    .filter((month) => month <= currentMonth);

  let runningBalance = 0;

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
