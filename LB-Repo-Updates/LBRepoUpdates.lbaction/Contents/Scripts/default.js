/* 
LB Repo Updates Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-14

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO:
- Maybe
  - html report with links to local and remote repos
*/

include('global.js');

const PROCESS_REPOS_SCRIPT = `${Action.path}/Contents/Scripts/process-repos.sh`;
const LOCAL_ACTION_UPDATES_PATH =
  '~/Library/Application Support/LaunchBar/Actions/Local Action Updates.lbaction';

function run() {
  // TODO: remove following after testing
  // LaunchBar.hide();
  // const timestamp = Date.now();
  // Action.preferences.timestamp = timestamp;
  // LaunchBar.performAction('Local Action Updates', timestamp);
  // return;

  validateCollectionDirs();
  validateRepositoryPaths();

  const collectionDirsCount = Action.preferences.collectionDirs?.length || 0;
  const repoCount = Object.keys(Action.preferences.repos || {}).length;

  return [
    collectionDirsCount > 0 && repoCount > 0
      ? {
          title: 'Pull & Update',
          subtitle:
            'Pulls updates from selected repos and runs "Local Action Updates"',
          alwaysShowsSubtitle: true,
          // icon: 'downTemplate',
          icon: File.readPlist(`${Action.path}/Contents/info.plist`)
            ?.CFBundleIconFile,
          action: 'checkForUpdates',
          actionRunsInBackground: true,
        }
      : {},
    collectionDirsCount > 0
      ? {
          title: 'Choose Repositories',
          icon: 'repoTemplate',
          badge: repoCount > 0 ? repoCount.toString() : undefined,
          action: 'listRepositories',
          actionReturnsItems: true,
        }
      : {},
    {
      title:
        collectionDirsCount > 0
          ? 'Manage Directories Holding GitHub Repos'
          : 'Locate Directory Holding GitHub Repos',
      badge:
        collectionDirsCount > 0 ? collectionDirsCount.toString() : undefined,
      action:
        collectionDirsCount > 0 ? 'listCollectionDirs' : 'locateDirectory',
      icon: 'folderTemplate',
      actionReturnsItems: collectionDirsCount > 0 ? true : false,
    },
  ];
}

function checkForUpdates() {
  LaunchBar.hide();

  const repos = Action.preferences.repos;
  const repoCount = Object.keys(repos).length;

  // Initial notification
  LaunchBar.displayNotification({
    title: 'Repository Updates',
    string: `Checking ${repoCount} repositor${
      repoCount === 1 ? 'y' : 'ies'
    } in the background…`,
  });

  LaunchBar.execute(
    '/bin/bash',
    PROCESS_REPOS_SCRIPT,
    Action.supportPath,
    ...Object.values(repos).map((repo) => repo.localPath)
  );

  const results = readResultsPlist();
  if (!results) {
    LaunchBar.alert('Error', 'Failed to process repositories');
    return;
  }

  processResults(repos, results, repoCount);
}

function processResults(repos, results, repoCount) {
  // Statistics
  const stats = Object.entries(repos).reduce(
    (acc, [_, repo]) => {
      const result = results[repo.localPath];

      if (result.behindBy > 0) {
        acc.totalBehind += result.behindBy;
        if (result.pullSuccess) {
          acc.hasAnyActionUpdates ||= result.hasActionUpdates;
          acc.hasStashedChanges ||= result.wasStashed;
        } else {
          acc.failedUpdates = [
            ...acc.failedUpdates,
            { name: repo.name, behindBy: result.behindBy },
          ];
        }
      }

      if (result.aheadBy > 0) {
        acc.totalAhead += result.aheadBy;
      }

      return acc;
    },
    {
      totalBehind: 0,
      totalAhead: 0,
      failedUpdates: [],
      hasAnyActionUpdates: false,
      hasStashedChanges: false,
    }
  );

  // Final Notification
  const title =
    stats.totalBehind === 0
      ? 'All Up to Date!'
      : stats.failedUpdates.length === 0
      ? 'Updates Complete!'
      : 'Partial Success!';

  const summaryLines = [
    `${repoCount} repo${repoCount === 1 ? '' : 's'}${
      stats.totalBehind + stats.totalAhead > 0
        ? `, ${stats.totalBehind + stats.totalAhead} change(s)`
        : ''
    }`,
    ...(stats.failedUpdates.length > 0
      ? [`"${stats.failedUpdates[0].name}" could not update`]
      : []),
    stats.hasStashedChanges
      ? 'Local changes were stashed and restored'
      : undefined,
    'Click to view full log!',
  ].filter(Boolean);

  if (stats.hasAnyActionUpdates) performLocalActionUpdates();

  LaunchBar.displayNotification({
    title: title,
    subtitle: stats.hasAnyActionUpdates
      ? undefined
      : 'No LaunchBar action changes!',
    string: summaryLines.join('\n'),
    url: File.fileURLForPath(results.logFile),
  });
}

function performLocalActionUpdates() {
  if (!File.exists(LOCAL_ACTION_UPDATES_PATH)) {
    LaunchBar.displayNotification({
      title: 'Local Action Updates',
      string: 'Action is not installed. Click this to learn more.',
      url: 'https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates#launchbar-action-local-action-updates',
    });
    return;
  }

  // Sending timestamp for validation in Local Action Updates action
  const timestamp = Date.now();
  Action.preferences.timestamp = timestamp;
  LaunchBar.performAction('Local Action Updates', timestamp);
}
