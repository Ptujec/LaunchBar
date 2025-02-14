/* 
LB Repo Updates Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function listRepositories() {
  cleanupCollectionDirs();

  const includedRepos = Action.preferences.repos || {};
  const collectionDirs = (Action.preferences.collectionDirs || []).filter(
    (dir) => File.exists(dir)
  );

  const repoPaths = LaunchBar.execute(
    '/bin/bash',
    Action.path + '/Contents/Scripts/find-repos.sh',
    ...collectionDirs
  )
    .trim()
    .split('\n')
    .filter(Boolean);

  const repos = repoPaths
    .map((path) => {
      const repoUrl = getRepoUrlFromConfig(`${path}/.git/config`);
      if (!repoUrl) return null;

      const isIncluded = includedRepos[repoUrl];
      const match = repoUrl.match(
        /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
      );
      if (!match) return null;

      const [, owner, name] = match;
      const repoInfo = { name, owner, localPath: path, url: repoUrl };

      return {
        title: isIncluded ? includedRepos[repoUrl].name : repoInfo.name,
        subtitle: `${repoInfo.owner}/${repoInfo.name}`,
        badge: isIncluded ? 'included' : undefined,
        icon: isIncluded ? 'checkTemplate' : 'circleTemplate',
        alwaysShowsSubtitle: true,
        action: isIncluded ? 'removeRepository' : 'addRepository',
        actionArgument: isIncluded ? repoUrl : repoInfo,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.badge && !b.badge) return -1;
      if (!a.badge && b.badge) return 1;
      if (a.title.toLowerCase().includes('launchbar')) return -1;
      if (b.title.toLowerCase().includes('launchbar')) return 1;
      return a.title.localeCompare(b.title);
    });

  return repos;
}

function addRepository(repoData) {
  if (!Action.preferences.repos) Action.preferences.repos = {};
  Action.preferences.repos[repoData.url] = repoData;
  return listRepositories();
}

function removeRepository(repoUrl) {
  delete Action.preferences.repos[repoUrl];
  return listRepositories();
}

function getRepoUrlFromConfig(configPath) {
  if (!File.exists(configPath)) return null;
  const config = File.readText(configPath);
  const match = config.match(
    /\[remote "origin"\][^\[]*url\s*=\s*(.+)(?:\n|$)/m
  );
  return match ? match[1].trim() : null;
}

function validateRepositoryPaths() {
  if (!Action.preferences.repos) return false;

  const invalidPaths = Object.entries(Action.preferences.repos)
    .filter(([_, repo]) => !File.exists(repo.localPath))
    .map(([url, repo]) => {
      // Remove repo with invalid path from preferences
      delete Action.preferences.repos[url];
      return { name: repo.name, path: repo.localPath };
    });

  if (invalidPaths.length) {
    LaunchBar.alert(
      'Repository Paths Not Found',
      `The following repositories are not checked for updates anymore because their local path no longer exists:\n\n${invalidPaths
        .map((r) => `${r.name}: ${r.path}`)
        .join('\n')}\n\nPlease add them again with correct paths if needed.`
    );
    return true;
  }
  return false;
}

// TODO: make sure a selected collection dir holds at least one repo
function locateDirectory() {
  LaunchBar.hide();

  const path = LaunchBar.executeAppleScript(
    `
    tell application "System Events" 
      activate
      set theFolder to choose folder with prompt "Choose a directory inside your home directory that holds GitHub repositories" default location "${LaunchBar.homeDirectory}"
      return POSIX path of theFolder
    end tell
    `
  )?.trim();

  LaunchBar.log(path);

  if (!path) return run();

  // Validate path is a subdirectory of home
  if (!path.startsWith(LaunchBar.homeDirectory + '/')) {
    LaunchBar.alert(
      'Invalid Directory',
      'Please select a directory inside your home directory.'
    );
    return locateDirectory();
  }

  let collectionPath = path;

  if (File.exists(`${path}/.git`)) {
    collectionPath = path.split('/').slice(0, -1).join('/');
    if (!collectionPath.startsWith(LaunchBar.homeDirectory + '/')) {
      LaunchBar.alert(
        'Invalid Repository Location',
        'The repository must be in a subdirectory of your home directory, not directly in home.'
      );
      return run();
    }
    const repoUrl = getRepoUrlFromConfig(`${path}/.git/config`);
    const match = repoUrl?.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (match) {
      const [, owner, name] = match;
      addRepository({ name, owner, localPath: path, url: repoUrl });
    }
  }

  const currentDirs = Action.preferences.collectionDirs || [];
  const isSubdirOfExisting = currentDirs.some((dir) =>
    collectionPath.startsWith(dir)
  );
  const existingSubdirs = currentDirs.filter((dir) =>
    dir.startsWith(collectionPath)
  );

  if (isSubdirOfExisting) {
    LaunchBar.alert(
      'Directory Already Included',
      'This directory is already included as it is a subdirectory of an existing collection directory. You can decide which repos to include in the "Choose Repositories" section.'
    );
  } else {
    // Remove any existing subdirectories and add the new path
    Action.preferences.collectionDirs = [
      ...currentDirs.filter((dir) => !existingSubdirs.includes(dir)),
      collectionPath,
    ];
  }

  if (Action.preferences.collectionDirs.length > 1) {
    setSourceDir();
  }

  return !Action.preferences.repos ||
    Object.keys(Action.preferences.repos).length === 0
    ? listRepositories()
    : run();
}

function listCollectionDirs() {
  const dirs = Action.preferences.collectionDirs || [];

  return [
    {
      title: 'Add Directory',
      icon: 'addTemplate',
      action: 'locateDirectory',
    },
    ...dirs.map((dir) => ({
      title: File.displayName(dir),
      subtitle: dir,
      alwaysShowsSubtitle: true,
      label: 'Click to remove',
      icon: 'folderTemplate',
      action: 'removeCollectionDir',
      actionArgument: dir,
    })),
  ];
}

function removeCollectionDir(dir) {
  Action.preferences.collectionDirs = (
    Action.preferences.collectionDirs || []
  ).filter((d) => d !== dir);

  if (Action.preferences.repos) {
    Action.preferences.repos = Object.fromEntries(
      Object.entries(Action.preferences.repos).filter(
        ([_, repo]) => !repo.localPath.startsWith(dir)
      )
    );
  }

  if (Action.preferences.collectionDirs.length < 2) {
    delete Action.preferences.sourceDir;
  }
  return run();
}

function cleanupCollectionDirs() {
  let dirs = Action.preferences.collectionDirs || [];
  if (dirs.length <= 1) return;

  // Sort by path length ascending so parent dirs come first
  dirs = dirs
    .sort((a, b) => a.length - b.length)
    .reduce((acc, dir) => {
      // Only keep this dir if it's not a subdirectory of any already accepted dir
      if (!acc.some((d) => dir.startsWith(d))) {
        acc.push(dir);
      }
      return acc;
    }, []);

  Action.preferences.collectionDirs = dirs;
}

function validateCollectionDirs() {
  if (!Action.preferences.collectionDirs) {
    const defaultPaths = [
      `${LaunchBar.homeDirectory}/GitHub`,
      `${LaunchBar.homeDirectory}/Developer/GitHub`,
      `${LaunchBar.homeDirectory}/Documents/GitHub`,
    ];

    Action.preferences.collectionDirs = defaultPaths.filter((path) =>
      File.exists(path)
    );
    return;
  }

  Action.preferences.collectionDirs = Action.preferences.collectionDirs.filter(
    (dir) => File.exists(dir)
  );

  if (
    !Action.preferences.collectionDirs ||
    Action.preferences.collectionDirs.length < 2
  ) {
    delete Action.preferences.sourceDir;
  }
}

function setSourceDir() {
  const collectionDirs = Action.preferences.collectionDirs || [];

  if (collectionDirs.length === 0) return run();

  if (collectionDirs.length === 1) {
    Action.preferences.sourceDir = collectionDirs[0];
    return run();
  }

  // Find common parent directory by comparing path segments
  const pathSegments = collectionDirs.map((path) => path.split('/'));
  const commonPath = pathSegments.reduce((common, segments) =>
    common.filter((segment, i) => segment === segments[i])
  );

  const suggestedPath = commonPath.join('/');
  const pathDepth = commonPath.filter(Boolean).length;

  if (pathDepth >= 2) {
    // That is at least a level deeper than the home directory
    Action.preferences.sourceDir = suggestedPath;
    return run();
  }

  LaunchBar.alert(
    'Set Source Directory',
    'Please set a single source directory for the "Local Action Updates" action.\nIt is not recommended to use your home directory but rather a directory inside your home directory (except the Library directory).'
  );

  LaunchBar.hide();
  const selectedPath = LaunchBar.executeAppleScript(
    `
    tell application "System Events"
    activate
    set theFolder to choose folder with prompt "Choose source directory for Local Action Updates" default location "${suggestedPath}"
    return POSIX path of theFolder
    end tell
    `
  )?.trim();

  if (!selectedPath) return run();
  Action.preferences.sourceDir = selectedPath;
  return run();
}

function validateSourceDir() {
  const sourceDir = Action.preferences.sourceDir;
  if (!sourceDir) return; // just safety, but currently not needed because we validate always on run()

  const isValid =
    File.exists(sourceDir) &&
    sourceDir.startsWith(`${LaunchBar.homeDirectory}/`) &&
    Action.preferences.collectionDirs?.every((dir) =>
      dir.startsWith(sourceDir)
    );

  if (!isValid) {
    delete Action.preferences.sourceDir;
    setSourceDir();
  }
}
