/* 
Actual Budget Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
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
  const json = JSON.parse(result);
  return Array.isArray(json)
    ? json.map((item) => ({ ...item, badge: item.badge || undefined }))
    : json;
}

function open(arg) {
  LaunchBar.hide();
  if (arg.startsWith('message://')) return LaunchBar.openURL(arg);
  return LaunchBar.openURL(File.fileURLForPath('/Applications/Actual.app'));
}
