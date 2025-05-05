/* 
Actual Budget - Add Transaction Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- implement cleared setting later … for now make all cleared
*/

include('global.js');

function run(argument) {
  // Action.preferences.transactionBudget reset is done in suggestions.js

  const { databasePath, budgetDataPath, budgetID } = getBudgetInfo();

  if (!File.exists(databasePath)) {
    return LaunchBar.alert('Database not found');
  }

  if (!argument) {
    return settings(budgetDataPath, budgetID);
  }

  // Check if entry is valid
  if (!/\d/.test(argument)) {
    return [{ title: 'No valid entry!', icon: 'alert' }];
  }

  return setAmount(argument);
}

function setAmount(argument) {
  const result = parseAmount(argument);
  if (!result.success) {
    return [{ title: 'No valid amount', icon: 'alert' }];
  }

  if (LaunchBar.options.commandKey) {
    const { budgetDataPath, budgetID } = getBudgetInfo();
    return listBudgets(budgetDataPath, budgetID, 'setBudgetForTransaction', {
      amount: result.value,
    });
  }

  recentPrefs.set('amount', result.value);
  return showPayees();
}

function setBudgetForTransaction({ databasePath, budgetID, amount }) {
  Action.preferences.transactionBudget = { databasePath, budgetID };

  // Get and cache number format for the new budget
  const data = getDatabaseData();
  numberFormatPrefs.set(data.numberFormat);

  recentPrefs.set('amount', amount);
  return showPayees();
}

function showPayees() {
  const data = getDatabaseData();

  if (!data || !data.payees || !data.payees.length) {
    return [{ title: 'No payees found', icon: 'alert' }];
  }

  const existingPayees = data.payees.map((payee) => ({
    title: payee.transfer_acct ? `Transfer: ${payee.name}` : payee.name,
    icon: 'payeeTemplate',
    action: 'setPayee',
    actionArgument: {
      id: payee.id,
      transfer_acct: payee.transfer_acct,
    },
    actionReturnsItems: true,
  }));

  const newPayee = [
    {
      title: 'New Payee',
      icon: 'newTemplate.png',
      action: 'setPayee',
      actionArgument: {
        id: '',
        transfer_acct: '',
      },
    },
  ];
  return [...newPayee, ...existingPayees];
}

function setPayee({ id: payeeId, transfer_acct }) {
  if (LaunchBar.options.commandKey && payeeId !== '') {
    return handlePayeeAction({ payeeId });
  }

  if (payeeId === '') {
    LaunchBar.hide();
    const newPayeeName = LaunchBar.executeAppleScript(
      'set result to display dialog "Enter Payee Name:" with title "New Payee" default answer ""',
      'set result to text returned of result'
    ).trim();

    if (newPayeeName === '') return;

    recentPrefs.set('newPayee', true);
    recentPrefs.set('newPayeeName', newPayeeName);
    recentPrefs.set('payee', '');
  } else {
    recentPrefs.set('newPayee', false);
    recentPrefs.set('newPayeeName', '');
    recentPrefs.set('payee', payeeId);
  }

  recentPrefs.set('transfer_acct', transfer_acct || '');

  if (transfer_acct) {
    recentPrefs.set('category', ''); // Set empty category for transfers
    return showAccounts();
  }

  return showCategories();
}

function handlePayeeAction({ payeeId }) {
  const data = getDatabaseData();

  // Get the 5 most recent transactions for this payee
  const payeeTransactions = data.transactions
    .filter((t) => t.payee_id === payeeId)
    .slice(0, 5);

  if (!payeeTransactions || payeeTransactions.length === 0) {
    return [{ title: 'No recent transactions', icon: 'alert' }];
  }

  return payeeTransactions.map((t) =>
    formatTransaction(t, data.numberFormat, data.dateFormat)
  );
}

function showCategories() {
  const data = getDatabaseData();
  if (!data || !data.categories || !data.categories.length) {
    return [{ title: 'No categories found', icon: 'alert' }];
  }

  const recentPayeeId = recentPrefs.get('payee');
  let recentCategoryId = '';

  if (recentPayeeId && data.transactions) {
    const recentTransaction = data.transactions.find(
      (t) => t.payee_id === recentPayeeId
    );
    if (recentTransaction) {
      recentCategoryId = recentTransaction.category_id;
    }
  }

  const currentDate = new Date();
  const currentMonth =
    currentDate.getFullYear() * 100 + (currentDate.getMonth() + 1);

  const currentMonthTransactions = data.transactions.filter(
    (t) => Math.floor(t.date / 100) === currentMonth
  );

  const sortedCategories = [...data.categories]
    .filter((cat) => cat.name !== 'Starting Balances')
    .sort((a, b) => {
      if (a.id === recentCategoryId) return -1;
      if (b.id === recentCategoryId) return 1;
      return 0;
    });

  return sortedCategories.map((cat) => {
    const balance = getCategoryBalance(
      cat.id,
      data.transactions,
      data.zero_budgets,
      cat
    );

    const budgetData = data.zero_budgets.find(
      (b) => b.month === currentMonth && b.category === cat.id
    ) || { budgeted: 0, carryover: 0 };

    const categoryTransactions = currentMonthTransactions.filter(
      (t) => t.category_id === cat.id
    );

    const netFlow = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);

    const noteText = data.notes?.find((note) => note.id === cat.id)?.note;

    const displayCarryover = budgetData.carryover === 1 ? ' →' : '';

    const displayBalance =
      balance !== 0
        ? `A: ${formatAmount(balance, data.numberFormat)}${displayCarryover}`
        : undefined;

    const displayNetFlow =
      netFlow !== 0 && netFlow !== balance
        ? `F: ${formatAmount(netFlow, data.numberFormat)}`
        : undefined;

    const displayBudgeted =
      budgetData.budgeted > 0
        ? `B: ${formatAmount(budgetData.budgeted, data.numberFormat)}`
        : 'No Budget';

    const subtitle =
      cat.group_is_income === 0
        ? [displayBalance, displayNetFlow, displayBudgeted]
            .filter(Boolean)
            .join(' ⋅ ')
        : formatAmount(netFlow, data.numberFormat);

    const icon =
      balance < 0
        ? 'categoryRed'
        : balance === 0
        ? 'categoryGreyTemplate'
        : 'categoryTemplate';

    return {
      title: cat.name,
      subtitle,
      alwaysShowsSubtitle: true,
      label: cat.group_name,
      badge: cat.id === recentCategoryId ? 'recent' : undefined,
      icon,
      action: 'setCategory',
      actionArgument: {
        id: cat.id,
        categoryTransactions,
        numberFormat: data.numberFormat,
        dateFormat: data.dateFormat,
        noteText,
      },
      actionReturnsItems: true,
    };
  });
}

function setCategory(args) {
  if (LaunchBar.options.commandKey) return handleCategoryAction(args);

  recentPrefs.set('category', args.id);
  return showAccounts();
}

function handleCategoryAction({
  categoryTransactions,
  numberFormat,
  dateFormat,
  noteText,
}) {
  const noteItem = noteText ? [{ title: noteText, icon: 'noteTemplate' }] : [];

  const transactionItems = categoryTransactions.map((t) =>
    formatTransaction(t, numberFormat, dateFormat)
  );

  return [...noteItem, ...transactionItems];
}

function showAccounts() {
  const data = getDatabaseData();
  if (!data || !data.accounts || !data.accounts.length) {
    return [{ title: 'No accounts found', icon: 'alert' }];
  }

  const recentPayeeId = recentPrefs.get('payee');
  const transfer_acct = recentPrefs.get('transfer_acct');
  let recentAccountId = null;

  if (recentPayeeId && data.transactions) {
    const recentTransaction = data.transactions.find(
      (t) => t.payee_id === recentPayeeId
    );
    if (recentTransaction) {
      recentAccountId = recentTransaction.account_id;
    }
  }

  const sortedAccounts = [...data.accounts]
    .filter((account) => !transfer_acct || account.id !== transfer_acct)
    .sort((a, b) => {
      if (a.id === recentAccountId) return -1;
      if (b.id === recentAccountId) return 1;
      return a.sort_order - b.sort_order;
    });

  return sortedAccounts.map((account) => ({
    title: account.name,
    label: `${formatAmount(account.balance, data.numberFormat)}`,
    badge: account.id === recentAccountId ? 'recent' : undefined,
    icon: account.balance < 0 ? 'accountRed' : 'accountTemplate',
    action: 'setAccount',
    actionArgument: { id: account.id },
    actionReturnsItems: true,
  }));
}

function setAccount({ id: accountId }) {
  recentPrefs.set('account', accountId);
  return showDates();
}

function showDates() {
  const today = new Date();

  return Array.from({ length: 180 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);

    const isoString = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split('T')[0];

    return {
      title: isoString,
      icon: 'calTemplate',
      action: 'setDate',
      actionArgument: isoString.replace(/-/g, ''), // Store as YYYYMMDD
      actionReturnsItems: true,
    };
  });
}

function setDate(dateString) {
  recentPrefs.set('date', parseInt(dateString, 10));
  return showNotesOptions();
}

function showNotesOptions() {
  return [
    {
      title: 'No Note',
      icon: 'noTemplate.png',
      action: 'setNote',
      actionArgument: '',
    },
    {
      title: 'Add Note',
      icon: 'newTemplate.png',
      action: 'setNote',
      actionArgument: 'Add Note',
    },
  ];
}

function setNote(note) {
  if (note == 'Add Note') {
    LaunchBar.hide();

    const [mailLinkRaw, subjectRaw] = LaunchBar.executeAppleScriptFile(
      './mail.applescript'
    )
      .trim()
      .split('\n');

    let defaultAnswer = '';

    if (mailLinkRaw && subjectRaw) {
      const mailLink = encodeURI(decodeURI(mailLinkRaw));
      let subject = subjectRaw.replace(/fwd: |aw: |wtr: |re: |fw: /gi, '');

      const maxLength = 199 - mailLink.length;
      if (subject.length > maxLength) {
        subject = `${subject.substring(0, maxLength - 1)}…`;
      }

      defaultAnswer = `${subject} ${mailLink}`;
    }

    note = LaunchBar.executeAppleScript(
      `set result to display dialog "Notes" with title "Notes" default answer "${defaultAnswer}"`,
      'set result to text returned of result'
    ).trim();

    if (!note) return; // If a user cancels
  }

  recentPrefs.set('note', note);
  LaunchBar.hide();
  return postTransaction();
}

function postTransaction() {
  const { databasePath } = getBudgetInfo();

  const amount = recentPrefs.get('amount');
  const accountId = recentPrefs.get('account');
  const categoryId = recentPrefs.get('category');
  const notes = recentPrefs.get('note') || '';
  const date = recentPrefs.get('date');
  const transferAcct = recentPrefs.get('transfer_acct');
  const isNewPayee = recentPrefs.get('newPayee');
  const payeeName = isNewPayee ? recentPrefs.get('newPayeeName') : '';
  const payeeId = recentPrefs.get('payee');

  // Execute transaction
  const result = LaunchBar.execute(
    '/bin/bash',
    './addTransaction.sh',
    databasePath,
    accountId,
    categoryId,
    amount,
    payeeId,
    notes,
    date,
    transferAcct || '',
    payeeName
  ).trim();

  if (result.startsWith('ERROR:')) {
    LaunchBar.displayNotification({
      title: 'Error adding transaction!',
      string: result.substring(7), // Remove "ERROR: " prefix
      url: File.fileURLForPath('/Applications/Actual.app'),
    });
    return;
  }

  const data = parseDataBase({ databasePath });
  const formattedAmount = formatAmount(amount, data.numberFormat);
  const account =
    data.accounts.find((a) => a.id === accountId)?.name || 'Unknown Account';
  const accountBalance =
    data.accounts.find((a) => a.id === accountId)?.balance || 0;

  if (transferAcct) {
    const transferAccount =
      data.accounts.find((a) => a.id === transferAcct)?.name ||
      'Unknown Account';
    const transferBalance =
      data.accounts.find((a) => a.id === transferAcct)?.balance || 0;

    LaunchBar.displayNotification({
      title: 'Transfer added successfully!',
      string: `${account} → ${transferAccount}: ${formattedAmount.replace(
        '-',
        ''
      )}\n${account}: ${formatAmount(
        accountBalance,
        data.numberFormat
      )}\n${transferAccount}: ${formatAmount(
        transferBalance,
        data.numberFormat
      )}`,
      url: File.fileURLForPath('/Applications/Actual.app'),
    });
    return;
  }

  const payee = isNewPayee
    ? payeeName
    : data.payees.find((p) => p.id === payeeId)?.name || 'Unknown Payee';
  const category = data.categories.find((c) => c.id === categoryId) || {
    name: 'Unknown Category',
  };

  // Get base category balance and add the new transaction amount
  // TODO: maybe we don't need to get the data again? … on the other hand it is confirmation that it got written to the db
  const categoryBalance = getCategoryBalance(
    categoryId,
    data.transactions,
    data.zero_budgets,
    category
  );

  const formattedDate = LaunchBar.formatDate(
    new Date(date.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')),
    {
      relativeDateFormatting: true,
      timeStyle: 'none',
      dateStyle: 'short',
    }
  );

  LaunchBar.displayNotification({
    title: 'Transaction added successfully!',
    string: `${payee}: ${formattedAmount} (${formattedDate})\n${
      category.name
    }: ${formatAmount(
      categoryBalance,
      data.numberFormat
    )}\n${account}: ${formatAmount(accountBalance, data.numberFormat)}`,
    url: File.fileURLForPath('/Applications/Actual.app'),
  });
}
