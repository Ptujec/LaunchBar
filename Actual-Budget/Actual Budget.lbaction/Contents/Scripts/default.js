/* 
Actual Budget Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- cache data … only refresh if database has changed
- clean up js code
*/

const globalStorePath =
  '~/Library/Application Support/Actual/global-store.json';

function run() {
  const globalStoreJson = File.readJSON(globalStorePath);
  const budgetDataPath = globalStoreJson['document-dir'];
  const lastBudget = globalStoreJson.lastBudget;
  const databasePath = `${budgetDataPath}/${lastBudget}/db.sqlite`;

  if (!File.exists(databasePath)) {
    return LaunchBar.alert('Database not found');
  }

  if (LaunchBar.options.commandKey) {
    const contents = File.getDirectoryContents(budgetDataPath);

    return contents
      .map((item) => {
        const badge = item === lastBudget ? '✓' : undefined;
        const metadataPath = budgetDataPath + '/' + item + '/metadata.json';
        const metadata = File.readJSON(metadataPath);
        const title = metadata.budgetName;
        return {
          title,
          icon: 'walletTemplate',
          badge,
          action: 'parseDataBase',
          actionArgument: `${budgetDataPath}/${item}/db.sqlite`,
          actionReturnsItems: true,
          isLastBudget: item === lastBudget,
        };
      })
      .sort((a, b) =>
        a.isLastBudget
          ? -1
          : b.isLastBudget
          ? 1
          : a.title.localeCompare(b.title)
      );
  }

  return parseDataBase(databasePath);
}

function parseDataBase(databasePath) {
  const result = LaunchBar.execute(
    '/bin/bash',
    './parseDataBase.sh',
    databasePath
  );

  // LaunchBar.log(result);
  // File.writeText(result, Action.supportPath + '/test.json');
  // return;

  try {
    const { accounts, transactions, numberFormat, dateFormat } =
      JSON.parse(result);

    const items = [
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

    return items;
  } catch (error) {
    LaunchBar.alert('Error parsing database:', error.message);
    return [];
  }
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

function open(arg) {
  LaunchBar.hide();
  if (arg.startsWith('message://')) return LaunchBar.openURL(arg);
  return LaunchBar.openURL(File.fileURLForPath('/Applications/Actual.app'));
}
