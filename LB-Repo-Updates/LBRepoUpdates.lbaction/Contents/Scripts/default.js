/* 
LB Repo Updates Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO:
- always perform local action updates setting ?
- Clean up the code
- different icons for fork an normal repo types ?
- play sound when done? … maybe a different one from the other action
*/

include('settings.js');

function run() {
  if (!Action.preferences.localRoot) {
    const defaultPathFirstTry = `${LaunchBar.homeDirectory}/GitHub/`;
    const defaultPathSecondTry = `${LaunchBar.homeDirectory}/Developer/GitHub/`;
    Action.preferences.localRoot = File.exists(defaultPathFirstTry)
      ? defaultPathFirstTry
      : File.exists(defaultPathSecondTry)
      ? defaultPathSecondTry
      : undefined;
  }

  const repoCount = Object.keys(Action.preferences.repos || {}).length;

  return [
    repoCount > 0
      ? {
          title: 'Pull & Update',
          subtitle:
            'Pulls updates from selected repos and runs "Local Action Updates"',
          alwaysShowsSubtitle: true,
          // icon: 'downTemplate',
          icon: File.readPlist(Action.path + '/Contents/info.plist')?.CFBundleIconFile,
          action: 'checkForUpdates',
          actionRunsInBackground: true,
        }
      : {},
    Action.preferences.localRoot
      ? {
          title: 'Choose Repositories',
          icon: 'repoTemplate',
          badge: repoCount > 0 ? repoCount.toString() : undefined,
          action: 'listRepositories',
          actionReturnsItems: true,
        }
      : {},
    {
      title: 'Choose GitHub Root Directory',
      subtitle: Action.preferences.localRoot || 'Not set',
      alwaysShowsSubtitle: true,
      action: 'setLocalRoot',
      icon: 'ghTemplate',
    },
    // repoCount > 0
    //   ? {
    //       title: 'Always Perform Local Action Updates',
    //       icon: 'updateTemplate',
    //       badge: Action.preferences.localUpdate ? 'On' : 'Off',
    //       action: 'localUpdateToggle',
    //     }
    //   : {},
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

  for (const repoUrl of Object.keys(repos)) {
    const repo = repos[repoUrl];
    const repoFileURL = File.fileURLForPath(repo.localPath);

    try {
      const statusOutput = LaunchBar.execute(
        '/bin/bash',
        Action.path + '/Contents/Scripts/check-repo-status.sh',
        repo.localPath,
        { workingDirectory: repo.localPath }
      );

      if (!statusOutput || !statusOutput.trim()) {
        throw new Error('No output from status check script');
      }

      const jsonMatch = statusOutput.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error('Could not find valid JSON in output');
      }

      const status = JSON.parse(jsonMatch[0]);

      if (status.error) {
        LaunchBar.displayNotification({
          title: 'Repository Check Error',
          subtitle: repo.name,
          string: status.error,
          url: repoFileURL,
        });
        continue;
      }

      if (!status.hasUpstream) {
        LaunchBar.displayNotification({
          title: 'Repository Warning',
          subtitle: repo.name,
          string: `Branch '${status.branch}' is not tracking a remote branch`,
          url: repoFileURL,
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
          title: 'Updates Available',
          subtitle: repo.name,
          string: message,
          url: repoFileURL,
        });

        if (pullUpdates(repo.localPath, repo.name, repoFileURL)) {
          successfulUpdates++;
        }
      } else if (status.aheadBy > 0) {
        LaunchBar.displayNotification({
          title: 'Repository Warning',
          subtitle: repo.name,
          string: `${status.aheadBy} local commits not pushed`,
          url: repoFileURL,
        });
      }
    } catch (error) {
      LaunchBar.displayNotification({
        title: 'Repository Check Error',
        subtitle: repo.name,
        string: error.toString(),
        url: repoFileURL,
      });
    }
  }

  const localRootURL = File.fileURLForPath(Action.preferences.localRoot);

  // Ensure this notification is shown if no updates are available
  if (updatesAvailable == false) {
    LaunchBar.displayNotification({
      title: 'Repository Updates',
      string: 'All repositories are up to date',
      url: localRootURL,
    });
  }

  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  if (successfulUpdates > 0) {
    performLocalActionUpdates();
  }
}

function pullUpdates(repoPath, repoName, repoFileURL) {
  try {
    const pullOutput = LaunchBar.execute(
      '/bin/bash',
      Action.path + '/Contents/Scripts/pull-repo-updates.sh',
      repoPath,
      { workingDirectory: repoPath }
    );
    if (pullOutput.trim() === 'Up to date') {
      // LaunchBar.displayNotification({
      //   title: 'Repository Update',
      //   subtitle: repoName,
      //   string: 'Repository is up to date',
      //   url: repoFileURL,
      // });
      return false;
    } else {
      // LaunchBar.displayNotification({
      //   title: 'Repository Update',
      //   subtitle: repoName,
      //   string: 'Updates pulled successfully',
      //   url: repoFileURL,
      // });
      return true;
    }
  } catch (error) {
    LaunchBar.displayNotification({
      title: 'Repository Update Error',
      subtitle: repoName,
      string: error.toString(),
      url: repoFileURL,
    });
    return false;
  }
}

function performLocalActionUpdates() {
  LaunchBar.performAction('Local Action Updates', Action.preferences.localRoot);
}
