/* 
LB Repo Updates Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-14

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO:
- try writing shell script results to plist file and read from there because execute() only returns the output as string `defaults` CLI
- Clean up the code 
*/

include('settings.js');

// Add these constants at the top after the include
const SCRIPTS_PATH = `${Action.path}/Contents/Scripts`;
const CHECK_REPO_STATUS_SCRIPT = `${SCRIPTS_PATH}/check-repo-status.sh`;
const PULL_REPO_UPDATES_SCRIPT = `${SCRIPTS_PATH}/pull-repo-updates.sh`;
const LOCAL_ACTION_UPDATES_PATH =
  '~/Library/Application Support/LaunchBar/Actions/Local Action Updates.lbaction';

function run() {
  validateCollectionDirs();
  validateRepositoryPaths();
  if (Action.preferences.sourceDir) validateSourceDir();

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
      subtitle: 'Ideally a single directory holding all relevant repos',
      alwaysShowsSubtitle: true,
      badge:
        collectionDirsCount > 0 ? collectionDirsCount.toString() : undefined,
      action:
        collectionDirsCount > 0 ? 'listCollectionDirs' : 'locateDirectory',
      icon: 'folderTemplate',
      actionReturnsItems: collectionDirsCount > 0 ? true : false,
    },
    collectionDirsCount > 1
      ? {
          title: Action.preferences.sourceDir
            ? 'Local Action Updates Source Directory'
            : 'Set Source Directory',
          subtitle: Action.preferences.sourceDir
            ? Action.preferences.sourceDir
            : '"Local Action Updates" action needs a single source',
          alwaysShowsSubtitle: true,
          icon: 'sourceTemplate',
          action: 'setSourceDir',
        }
      : {},
  ];
}

function checkForUpdates() {
  LaunchBar.hide();

  const repos = Action.preferences.repos;
  let updatesAvailable = false;
  let successfulUpdates = 0;
  let hasAnyActionUpdates = false;

  for (const repoUrl of Object.keys(repos)) {
    const repo = repos[repoUrl];
    const repoCommitsURL = repoUrl.replace('.git', '/commits');

    try {
      LaunchBar.execute(
        '/bin/bash',
        CHECK_REPO_STATUS_SCRIPT,
        repo.localPath,
        Action.supportPath,
        { workingDirectory: repo.localPath }
      );

      const status = readResultsPlist('status');

      if (!status) throw new Error('No output from status check script');

      if (status.error) {
        LaunchBar.displayNotification({
          title: 'Repository Status',
          subtitle: `Error for ${repo.name}`,
          string: status.error,
          url: repoCommitsURL,
        });
        continue;
      }

      if (!status.hasUpstream) {
        LaunchBar.displayNotification({
          title: 'Repository Status',
          subtitle: `Warning for ${repo.name}`,
          string: `Branch '${status.branch}' is not tracking a remote branch`,
          url: repoCommitsURL,
        });
        continue;
      }

      if (status.behindBy > 0) {
        updatesAvailable = true;
        let message = `${status.behindBy} change(s) in ${repo.name}`;
        if (status.aheadBy > 0) {
          message += ` (Warning: Local repo is ${status.aheadBy} commit(s) ahead)`;
        }

        LaunchBar.displayNotification({
          title: 'Repository Status',
          string: message,
          url: repoCommitsURL,
        });

        const pullResult = pullUpdates(
          repo.localPath,
          repo.name,
          repoCommitsURL
        );
        if (pullResult.success) {
          successfulUpdates++;
          if (pullResult.hasActionUpdates) {
            hasAnyActionUpdates = true;
          }
        }
      } else if (status.aheadBy > 0) {
        LaunchBar.displayNotification({
          title: 'Repository Status',
          subtitle: `Warning for ${repo.name}`,
          string: `${status.aheadBy} local commit(s) not pushed`,
          url: repoCommitsURL,
        });
      }
    } catch (error) {
      LaunchBar.displayNotification({
        title: 'Repository Status',
        subtitle: `Error for ${repo.name}`,
        string: error.toString(),
        url: repoCommitsURL,
      });
    }
  }

  if (updatesAvailable == false) {
    LaunchBar.displayNotification({
      title: 'Repository Status',
      string: 'All repositories are up to date',
    });
  }

  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  if (successfulUpdates > 0 && hasAnyActionUpdates) {
    performLocalActionUpdates();
  } else if (successfulUpdates > 0) {
    LaunchBar.displayNotification({
      title: 'Pull Status',
      string: 'Updates pulled successfully, but no action changes detected.',
    });
  }
}

function pullUpdates(repoPath, repoName, repoCommitsURL) {
  try {
    LaunchBar.execute(
      '/bin/bash',
      PULL_REPO_UPDATES_SCRIPT,
      repoPath,
      Action.supportPath,
      { workingDirectory: repoPath }
    );

    const result = readResultsPlist('pull');

    if (!result || result.status === 'error') {
      throw new Error(result?.message || 'Unknown error occurred');
    }

    LaunchBar.log(`Pull result for ${repoName}:`, JSON.stringify(result));
    return {
      success: true,
      hasActionUpdates: result.hasActionUpdates,
    };
  } catch (error) {
    LaunchBar.displayNotification({
      title: 'Pull Status',
      subtitle: `Error for ${repoName}`,
      string: error.toString(),
      url: repoCommitsURL,
    });
    LaunchBar.log(`Error pulling updates for ${repoName}: ${error.toString()}`);
    return { success: false, hasActionUpdates: false };
  }
}

function readResultsPlist(type = 'status') {
  const filename =
    type === 'pull' ? 'PullResults.plist' : 'StatusResults.plist';
  const plistPath = `${Action.supportPath}/${filename}`;

  if (!File.exists(plistPath)) return null;
  return File.readPlist(plistPath);
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

  const sourceDir =
    Action.preferences.sourceDir || Action.preferences.collectionDirs?.[0];

  if (!sourceDir) {
    LaunchBar.displayNotification({
      title: 'Local Action Updates',
      string:
        'Could not run "Local Action Updates" because no source directory is configured',
    });
    return;
  }

  LaunchBar.performAction('Local Action Updates', sourceDir);
}
