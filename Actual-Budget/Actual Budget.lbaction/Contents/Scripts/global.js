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

function getDatabaseData(customDatabasePath, customBudgetID) {
  const { databasePath: defaultDatabasePath, budgetID: defaultBudgetID } =
    getBudgetInfo();
  const databasePath = customDatabasePath || defaultDatabasePath;
  const budgetID = customBudgetID || defaultBudgetID;
  const cacheFilePath = `${Action.supportPath}/db-cache-${budgetID}.json`;

  const result = LaunchBar.execute(
    '/bin/bash',
    './parseDataBase.sh',
    databasePath,
    cacheFilePath
  );

  if (!result) {
    LaunchBar.alert('Error reading database. No result.');
    return;
  }

  try {
    const data = JSON.parse(result);
    if (data.useCache) return File.readJSON(cacheFilePath);
    File.writeJSON(data, cacheFilePath);
    return data;
  } catch (error) {
    LaunchBar.alert('Error parsing database:', error.message);
    return;
  }
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

function getCategoryBalance(categoryId, transactions) {
  const currentDate = new Date();
  const currentMonth =
    currentDate.getFullYear() * 100 + (currentDate.getMonth() + 1);

  return transactions
    .filter((t) => {
      const transDate = parseInt(String(t.date).substring(0, 6));
      return transDate === currentMonth && t.category_id === categoryId;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}
