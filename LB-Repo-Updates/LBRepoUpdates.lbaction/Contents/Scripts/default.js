/* 
LB Repo Updates Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO:
- choose source dir for local action updates
- ignore readme updates
- Clean up the code
*/

include('settings.js');

function run() {
  if (!Action.preferences.collectionDirs) {
    const defaultPaths = [
      `${LaunchBar.homeDirectory}/GitHub/`,
      `${LaunchBar.homeDirectory}/Developer/GitHub/`
    ];
    
    Action.preferences.collectionDirs = defaultPaths.reduce((acc, path) => 
      File.exists(path) ? [...acc, path] : acc, 
    []);
  }
  
  const movedRepoLocations = checkRepositoryPaths(); 

  const repoCount = Object.keys(Action.preferences.repos || {}).length;
  const collectionDirsCount = Action.preferences.collectionDirs?.length || 0;

  return [
    (collectionDirsCount > 0 && repoCount > 0 && !movedRepoLocations)
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
      title: 'Locate Directory Holding GitHub Repos',
      subtitle: 'Ideally a single directory holding all relevant repos',
      alwaysShowsSubtitle: true,
      badge: collectionDirsCount > 0 ? collectionDirsCount.toString() : undefined,
      action: collectionDirsCount > 0 ? 'listCollectionDirs' : 'locateDirectory',
      icon: 'folderTemplate',
      actionReturnsItems: collectionDirsCount > 0 ? true : false,
    },
    {
      // TODO:  wennn meherer collectionDirs … set source dir für local action updates
    }
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
          title: repo.name,
          string: message,
          url: repoFileURL,
        });

        const pullResult = pullUpdates(repo.localPath, repo.name, repoFileURL);
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

  if (updatesAvailable == false) {
    LaunchBar.displayNotification({
      title: 'Repository Updates',
      string: 'All repositories are up to date',
      // TODO: add url? to source dir?
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

function pullUpdates(repoPath, repoName, repoFileURL) {
  try {
    const pullOutput = LaunchBar.execute(
      '/bin/bash',
      Action.path + '/Contents/Scripts/pull-repo-updates.sh',
      repoPath,
      { workingDirectory: repoPath }
    );

    // Parse the JSON output from the shell script
    const jsonMatch = pullOutput.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error('Could not find valid JSON in output');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.status === 'error') {
      throw new Error(result.message);
    }

    LaunchBar.log(`Pull result for ${repoName}: ${pullOutput}`);
    return { 
      success: true, 
      hasActionUpdates: result.hasActionUpdates 
    };

  } catch (error) {
    LaunchBar.displayNotification({
      title: 'Repository Update Error',
      subtitle: repoName,
      string: error.toString(),
      url: repoFileURL,
    });
    LaunchBar.log(`Error pulling updates for ${repoName}: ${error.toString()}`);
    return { success: false, hasActionUpdates: false };
  }
}

function performLocalActionUpdates() {
/* TODO: 
- setting to choose a dirctory if more than one collection dir or repo dir is configured
*/

  const sourceDir = Action.preferences.collectionDirs?.[0]  

  if (!sourceDir) {
    LaunchBar.displayNotification({
      title: 'Repository Updates',
      string: 'Could not run "Local Action Updates" because no source directory is configured',
    });
   return;
  }

  LaunchBar.performAction('Local Action Updates', sourceDir);
}


