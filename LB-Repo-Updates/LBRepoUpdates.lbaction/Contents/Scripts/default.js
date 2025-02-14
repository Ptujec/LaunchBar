/* 
LB Repo Updates Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO:
- try writing shell script results to plist file and read from there because execute() only returns the output as string `defaults` CLI
- make sure a selected collection dir holds at least one repo
- Clean up the code 
*/

include('settings.js');

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
          icon: File.readPlist(Action.path + '/Contents/info.plist')
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

  if (
    !Action.preferences.repos ||
    Object.keys(Action.preferences.repos).length === 0
  ) {
    LaunchBar.displayNotification({
      title: 'Repository Updates',
      subtitle: 'No repositories configured',
      string: 'Please add repositories to monitor first',
    });
    return run();
  }

  const repos = Action.preferences.repos;
  let updatesAvailable = false;
  let successfulUpdates = 0;
  let hasAnyActionUpdates = false;

  for (const repoUrl of Object.keys(repos)) {
    const repo = repos[repoUrl];
    const repoCommitsURL = repoUrl.replace('.git', '/commits');

    try {
      const statusOutput = LaunchBar.execute(
        '/bin/bash',
        Action.path + '/Contents/Scripts/check-repo-status.sh',
        repo.localPath,
        Action.supportPath,
        { workingDirectory: repo.localPath }
      );

      // Read results from plist instead of parsing output
      const status = readResultsPlist('status');

      if (!status) {
        throw new Error('No output from status check script');
      }

      if (status.error) {
        LaunchBar.displayNotification({
          title: 'Repository Check Error',
          subtitle: repo.name,
          string: status.error,
          url: repoCommitsURL,
        });
        continue;
      }

      if (!status.hasUpstream) {
        LaunchBar.displayNotification({
          title: 'Repository Warning',
          subtitle: repo.name,
          string: `Branch '${status.branch}' is not tracking a remote branch`,
          url: repoCommitsURL,
        });
        continue;
      }

      if (status.behindBy > 0) {
        updatesAvailable = true;
        let message = `${status.behindBy} updates available`;
        if (status.aheadBy > 0) {
          message += ` (Warning: Local repo is ${status.aheadBy} commits ahead)`;
        }

        LaunchBar.displayNotification({
          title: repo.name,
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
          title: 'Repository Warning',
          subtitle: repo.name,
          string: `${status.aheadBy} local commits not pushed`,
          url: repoCommitsURL,
        });
      }
    } catch (error) {
      LaunchBar.displayNotification({
        title: 'Repository Check Error',
        subtitle: repo.name,
        string: error.toString(),
        url: repoCommitsURL,
      });
    }
  }

  if (updatesAvailable == false) {
    LaunchBar.displayNotification({
      title: 'Repository Updates',
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
      title: 'Repository Updates',
      string: 'Updates pulled successfully, but no action changes detected.',
    });
  }
}

function pullUpdates(repoPath, repoName, repoCommitsURL) {
  try {
    LaunchBar.execute(
      '/bin/bash',
      Action.path + '/Contents/Scripts/pull-repo-updates.sh',
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
      title: 'Repository Update Error',
      subtitle: repoName,
      string: error.toString(),
      url: repoCommitsURL,
    });
    LaunchBar.log(`Error pulling updates for ${repoName}: ${error.toString()}`);
    return { success: false, hasActionUpdates: false };
  }
}

function performLocalActionUpdates() {
  const sourceDir =
    Action.preferences.sourceDir || Action.preferences.collectionDirs?.[0];

  if (!sourceDir) {
    LaunchBar.displayNotification({
      title: 'Repository Updates',
      string:
        'Could not run "Local Action Updates" because no source directory is configured',
    });
    return;
  }

  LaunchBar.performAction('Local Action Updates', sourceDir);
}

function readResultsPlist(type = 'status') {
  const filename =
    type === 'pull' ? 'PullResults.plist' : 'StatusResults.plist';
  const plistPath = `${Action.supportPath}/${filename}`;

  if (!File.exists(plistPath)) return null;
  return File.readPlist(plistPath);
}
