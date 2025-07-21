/*
Actual Budget - Add Transaction Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const globalStorePath =
  '~/Library/Application Support/Actual/global-store.json';

const maxNoteLength = 199; // Maximum length for note including URL/link

// MARK: - Core Configuration and State Management

const budgetPrefs = {
  get() {
    const prefs = Action.preferences.defaultBudget;
    if (prefs?.budgetID) {
      return prefs;
    }

    // Only use lastBudget as default if no budget was ever selected
    const globalStore = File.readJSON(globalStorePath);
    return {
      databasePath: `${globalStore['document-dir']}/${globalStore.lastBudget}/db.sqlite`,
      budgetID: globalStore.lastBudget,
    };
  },

  set({ databasePath, budgetID }) {
    Action.preferences.defaultBudget = { databasePath, budgetID };
  },
};

const numberFormatPrefs = {
  get() {
    const { budgetID } = getBudgetInfo();
    const prefs = Action.preferences.recentTransactions || {};
    return (prefs[budgetID] || {}).numberFormat;
  },

  set(format) {
    const { budgetID } = getBudgetInfo();
    const allPrefs = Action.preferences.recentTransactions || {};
    allPrefs[budgetID] = {
      ...(allPrefs[budgetID] || {}),
      numberFormat: format,
    };
    Action.preferences.recentTransactions = allPrefs;
    return format;
  },
};

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

// MARK: - Budget Management

function getBudgetInfo() {
  const globalStore = File.readJSON(globalStorePath);
  const budgetDataPath = globalStore['document-dir'];

  const transactionBudget = Action.preferences.transactionBudget;
  if (transactionBudget?.budgetID) {
    return { ...transactionBudget, budgetDataPath };
  }

  return { ...budgetPrefs.get(), budgetDataPath };
}

function settings(budgetDataPath, defaultBudget) {
  return listBudgets(budgetDataPath, defaultBudget, 'setBudget', {
    budgetDataPath,
    defaultBudget,
  });
}

function setBudget({ databasePath, budgetID, budgetDataPath, defaultBudget }) {
  budgetPrefs.set({ databasePath, budgetID });
  return settings(budgetDataPath, budgetID);
}

function listBudgets(budgetDataPath, defaultBudget, action, extraArgs = {}) {
  const contents = File.getDirectoryContents(budgetDataPath);

  return contents.map((item) => {
    const badge = item === defaultBudget ? 'default' : undefined;
    const metadataPath = budgetDataPath + '/' + item + '/metadata.json';

    try {
      const metadata = File.readJSON(metadataPath);
      return {
        title: metadata.budgetName,
        icon: 'walletTemplate',
        badge,
        action,
        actionArgument: {
          databasePath: `${budgetDataPath}/${item}/db.sqlite`,
          budgetID: item,
          ...extraArgs,
        },
        actionReturnsItems: action === 'setBudgetForTransaction' ? true : false,
      };
    } catch (error) {
      return {
        title: `Could not read metadata from ${metadataPath}`,
        icon: 'alert',
      };
    }
  });
}

// MARK: - Database Operations

function getDatabaseData() {
  const { databasePath } = getBudgetInfo();
  return parseDataBase({ databasePath });
}

function parseDataBase({ databasePath }) {
  const cacheFilePath = `${Action.supportPath}/db-cache-${
    getBudgetInfo().budgetID
  }.json`;

  if (Action.preferences.skipFileCheck) return File.readJSON(cacheFilePath); // return early when we already have fresh data

  // Check if cache is valid
  if (File.exists(cacheFilePath)) {
    const dbModDate = File.modificationDate(databasePath);
    const cacheModDate = File.modificationDate(cacheFilePath);

    if (dbModDate < cacheModDate) {
      return File.readJSON(cacheFilePath);
    }
  }

  const result = LaunchBar.execute(
    '/bin/bash',
    './parseDataBase.sh',
    databasePath
  );

  if (!result) {
    LaunchBar.alert('Error reading database. No result.');
    return;
  }

  try {
    const data = JSON.parse(result);
    File.writeJSON(data, cacheFilePath);
    return data;
  } catch (error) {
    LaunchBar.alert('Error parsing database:', error.message);
    return;
  }
}

// MARK: - Amount and Date Formatting

// TODO: außer wenn man es schon ensprechend eingibt 30.00 sollte nicht 30,00 werden

function parseAmount(input) {
  let numberFormat = numberFormatPrefs.get();
  if (!numberFormat) {
    const data = getDatabaseData();
    numberFormat = data.numberFormat;
    numberFormatPrefs.set(numberFormat);
  }

  // Check for calculation first
  if (/\d+[,.]?\d*\s*[+-]\s*\d+/.test(input)) {
    const result = parseCalculation(input, numberFormat);
    if (result) return result;
  }

  // Fall back to single number parsing
  const singleResult = parseSingleAmount(input, numberFormat);
  return singleResult.success
    ? formatAmountResult(singleResult.value, numberFormat)
    : { success: false };
}

function parseCalculation(input, numberFormat) {
  const numbers = input
    .split(/[+-]/)
    .map((n) => parseSingleAmount(n.trim(), numberFormat)?.value);
  if (numbers.includes(undefined)) return null;

  const operators = input.match(/[+-]/g) || [];
  return formatAmountResult(
    numbers.reduce((sum, num, i) =>
      i === 0 ? num : operators[i - 1] === '+' ? sum + num : sum - num
    ),
    numberFormat
  );
}

function parseSingleAmount(input, numberFormat) {
  const income = input.includes('+');
  const cleanedInput = input.replace(/[+€$]|[^\d,.]/g, '').trim();

  if (!cleanedInput) return { success: false };

  let amount;
  if (cleanedInput.includes(',') || cleanedInput.includes('.')) {
    const [whole, decimal = ''] = cleanedInput.split(/[,.]/);
    amount = `${whole || '0'}${decimal.padEnd(2, '0')}`;
  } else {
    amount =
      cleanedInput.length <= 2 ? cleanedInput.padStart(2, '0') : cleanedInput;
  }

  return {
    success: true,
    value: parseInt(income ? amount : `-${amount}`),
  };
}

function formatAmountResult(value, numberFormat) {
  const separatorMap = {
    dot: '.',
    comma: ',',
  };
  const separator = separatorMap[numberFormat.split('-')[1]] || '.';

  const isPositive = value >= 0;
  const absResult = Math.abs(value).toString().padStart(2, '0');
  const displayWhole = absResult.slice(0, -2) || '0';
  const displayDecimals = absResult.slice(-2);

  return {
    success: true,
    income: isPositive,
    amount: absResult,
    displayAmount: `${
      isPositive ? '+' : '-'
    }${displayWhole}${separator}${displayDecimals}`,
    value: value,
  };
}

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
    subtitle += ` ⋅ ${truncatedNotes}`;
  }

  return {
    icon: getTransactionIcon(isReconciliation, t.amount),
    title,
    subtitle,
    alwaysShowsSubtitle: true,
    label: messageUrl ? '􀉣' : undefined,
    badge: t.account_name,
    action: 'open',
    actionArgument: messageUrl ?? '',
    actionRunsInBackground: true,
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

// MARK: - Category and Transaction Calculations

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

// MARK: - Note Management

function getNote() {
  let defaultAnswer = '';

  const [appID, isSupported, mailRunning] = LaunchBar.execute(
    '/bin/bash',
    './appInfo.sh'
  )
    .trim()
    .split('\n');

  if (isSupported === 'true') {
    defaultAnswer = getNoteFromBrowser(appID);
  } else if (mailRunning !== undefined) {
    defaultAnswer = getNoteFromMail();
  }

  return LaunchBar.executeAppleScript(
    `set result to display dialog "Note:" with title "Add Note & Complete" default answer "${defaultAnswer}"`,
    'set result to text returned of result'
  ).trim();
}

function getNoteFromBrowser(appID) {
  LaunchBar.log(appID);

  if (appID === 'org.mozilla.firefox' || appID === 'app.zen-browser.zen') {
    LaunchBar.executeAppleScript(`
        tell application id "${appID}" to activate
        delay 0.2
        tell application "System Events"
          keystroke "l" using {command down}
          delay 0.2
          keystroke "c" using {command down}
          delay 0.2
          key code 53
        end tell
        delay 0.2
      `);
    return LaunchBar.getClipboardString();
  }

  const script =
    appID == 'com.apple.Safari'
      ? `
      tell application id "${appID}"
          set _url to URL of front document
          set _name to name of front document
          return _name & "\n" & _url
      end tell`
      : `
      tell application id "${appID}"
          set _url to URL of active tab of front window
          set _name to title of active tab of front window
          return _name & "\n" & _url
      end tell`;

  const [name, url] = LaunchBar.executeAppleScript(script).split('\n');
  const maxLength = maxNoteLength - url.length;
  let truncatedName = name;

  if (truncatedName.length > maxLength) {
    truncatedName = `${truncatedName.substring(0, maxLength - 1)}…`;
  }

  const note = `${truncatedName} ${url}`;
  LaunchBar.log('Note: ' + note);
  return note;
}

function getNoteFromMail() {
  const [mailLinkRaw, subjectRaw] = LaunchBar.executeAppleScriptFile(
    './mail.applescript'
  )
    .trim()
    .split('\n');

  if (mailLinkRaw && subjectRaw) {
    const mailLink = encodeURI(decodeURI(mailLinkRaw));
    let subject = subjectRaw.replace(/fwd: |aw: |wtr: |re: |fw: /gi, '');

    const maxLength = maxNoteLength - mailLink.length;
    if (subject.length > maxLength) {
      subject = `${subject.substring(0, maxLength - 1)}…`;
    }

    return `${subject} ${mailLink}`;
  }

  return '';
}

// MARK: - Interface Item Actions

function open(arg) {
  LaunchBar.hide();
  if (arg.startsWith('message://')) return LaunchBar.openURL(arg);
  return LaunchBar.openURL(File.fileURLForPath('/Applications/Actual.app'));
}
