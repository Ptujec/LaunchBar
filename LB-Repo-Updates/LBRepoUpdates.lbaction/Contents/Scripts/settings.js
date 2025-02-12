/* 
LB Repo Updates Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function listRepositories() {
  cleanupCollectionDirs();
  
  const includedRepos = Action.preferences.repos || {};
  const collectionDirs = (Action.preferences.collectionDirs || []).filter(dir => File.exists(dir));

  const repoPaths = LaunchBar.execute(
    '/bin/bash',
    Action.path + '/Contents/Scripts/find-repos.sh',
    ...collectionDirs
  )
    .trim()
    .split('\n')
    .filter(Boolean);

  const repos = repoPaths
    .map(path => {
      const repoUrl = getRepoUrlFromConfig(`${path}/.git/config`);
      if (!repoUrl) return null;

      const isIncluded = includedRepos[repoUrl];
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
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

function checkRepositoryPaths() {
  if (!Action.preferences.repos) return false;
  
  const invalidPaths = Object.entries(Action.preferences.repos)
    .filter(([_, repo]) => !File.exists(repo.localPath))
    .map(([url, repo]) => {
      // Remove repo with invalid path from preferences
      delete Action.preferences.repos[url];
      return {name: repo.name, path: repo.localPath};
    });

  if (invalidPaths.length) {
    LaunchBar.alert(
      'Repository Paths Not Found',
      `The following repositories are not checked for updates anymore because their local path no longer exists:\n\n${invalidPaths.map(r => `${r.name}: ${r.path}`).join('\n')}\n\nPlease add them again with correct paths if needed.`
    );  
    return true;
  }
  return false;
}

function locateDirectory() {
  LaunchBar.hide();

  const path = LaunchBar.executeAppleScript(
    `
    tell application "System Events" 
      activate
      set theFolder to choose folder with prompt "Choose a directory that holds GitHub repositories" default location "${LaunchBar.homeDirectory}"
      return POSIX path of theFolder
    end tell
    `
  )?.trim();

  if (!path) return run();
  
  const normalizedPath = path.endsWith('/') ? path : `${path}/`;

  let collectionPath = normalizedPath;
  
  if (File.exists(`${normalizedPath}.git`)) {
    // Get parent directory path instead of just the repo name
    collectionPath = normalizedPath.split('/').slice(0, -2).join('/') + '/';
    const repoUrl = getRepoUrlFromConfig(`${normalizedPath}.git/config`);
    const match = repoUrl?.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (match) {
      const [, owner, name] = match;
      addRepository({ name, owner, localPath: normalizedPath, url: repoUrl });
    }
  }
  
  const currentDirs = Action.preferences.collectionDirs || [];
  const isSubdirOfExisting = currentDirs.some(dir => collectionPath.startsWith(dir));
  const existingSubdirs = currentDirs.filter(dir => dir.startsWith(collectionPath));
  
  if (isSubdirOfExisting) {
    LaunchBar.alert(
      'Directory Already Included',
      'This directory is already included as it is a subdirectory of an existing collection directory. You can decide which repos to include in the "Choose Repositories" section.'
    );
  } else {
    // Remove any existing subdirectories and add the new path
    Action.preferences.collectionDirs = [
      ...currentDirs.filter(dir => !existingSubdirs.includes(dir)),
      collectionPath
    ];
  }

  return (!Action.preferences.repos || Object.keys(Action.preferences.repos).length === 0) ? listRepositories() : run();
}

function listCollectionDirs() {
  const dirs = Action.preferences.collectionDirs || [];
  
  return [
    {
      title: 'Add Directory',
      icon: 'addTemplate',
      action: 'locateDirectory',
    },
    ...dirs.map(dir => ({
      title: File.displayName(dir),
      subtitle: dir,
      alwaysShowsSubtitle: true,
      label: 'Click to remove',
      icon: 'folderTemplate',
      action: 'removeCollectionDir',
      actionArgument: dir,
    }))
  ];
}

function removeCollectionDir(dir) {
  Action.preferences.collectionDirs = (Action.preferences.collectionDirs || [])
    .filter(d => d !== dir);

  if (Action.preferences.repos) {
    Action.preferences.repos = Object.fromEntries(
      Object.entries(Action.preferences.repos)
        .filter(([_, repo]) => !repo.localPath.startsWith(dir))
    );
  }
  
  return run();
}

function cleanupCollectionDirs() {
  let dirs = Action.preferences.collectionDirs || [];
  if (dirs.length <= 1) return;

  // Sort by path length ascending so parent dirs come first
  dirs.sort((a, b) => a.length - b.length).reduce((acc, dir) => {
    // Only keep this dir if it's not a subdirectory of any already accepted dir
    if (!acc.some(d => dir.startsWith(d))) {
      acc.push(dir);
    }
    return acc;
  }, []);

  Action.preferences.collectionDirs = dirs;
}
