/* 
LB Repo Updates Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-22

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const MAX_REPO_DEPTH = '4';
const FIND_REPOS_SCRIPT = `${Action.path}/Contents/Scripts/find-repos.sh`;

function listRepositories() {
  cleanupCollectionDirs();

  const includedRepos = Action.preferences.repos || {};
  const collectionDirs = (Action.preferences.collectionDirs || []).filter(
    (dir) => File.exists(dir)
  );

  const repoPaths = LaunchBar.execute(
    '/bin/bash',
    FIND_REPOS_SCRIPT,
    MAX_REPO_DEPTH,
    ...collectionDirs
  )
    .trim()
    .split('\n')
    .filter(Boolean);

  const allRepos = repoPaths
    .map((path) => {
      const repoUrl = getRepoUrlFromConfig(`${path}/.git/config`);
      return repoUrl ? { path, ...parseRepoUrl(repoUrl), url: repoUrl } : null;
    })
    .filter(Boolean);

  // Second pass to create UI items
  const repos = allRepos.map((repo) => {
    const isIncluded = includedRepos[repo.url];
    const title = isIncluded ? includedRepos[repo.url].name : repo.name;
    const hasDuplicate = allRepos.some(
      (r) =>
        r.path !== repo.path && r.name === repo.name && r.owner === repo.owner
    );

    return {
      title: hasDuplicate ? `${title} [${repo.host}]` : title,
      subtitle: `${repo.owner}/${repo.name}`,
      badge: isIncluded ? 'included' : undefined,
      icon: isIncluded ? 'checkTemplate' : 'circleTemplate',
      alwaysShowsSubtitle: true,
      action: isIncluded ? 'removeRepository' : 'addRepository',
      actionArgument: isIncluded ? repo.url : { ...repo, localPath: repo.path },
    };
  });

  return repos.sort((a, b) => {
    if (a.badge && !b.badge) return -1;
    if (!a.badge && b.badge) return 1;
    if (a.title.toLowerCase().includes('launchbar')) return -1;
    if (b.title.toLowerCase().includes('launchbar')) return 1;
    return a.title.localeCompare(b.title);
  });
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

function hasRepositoryInHierarchy(path) {
  const result = LaunchBar.execute(
    '/bin/bash',
    FIND_REPOS_SCRIPT,
    MAX_REPO_DEPTH,
    path
  ).trim();

  return result.length > 0;
}

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

  if (!path) return run();

  if (!path.startsWith(`${LaunchBar.homeDirectory}/`)) {
    LaunchBar.alert(
      'Invalid Directory',
      'Please select a directory inside your home directory.'
    );
    return locateDirectory();
  }

  let collectionPath = path;
  let autoIncludedRepo = null;

  if (File.exists(`${path}/.git`)) {
    collectionPath = path.split('/').slice(0, -1).join('/');
    if (!collectionPath.startsWith(`${LaunchBar.homeDirectory}/`)) {
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
      autoIncludedRepo = name;
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
    const message = autoIncludedRepo
      ? `The repository "${autoIncludedRepo}" has been included. You don't need to add repositories within an included directory individually though. You can manage them in the "Choose Repositories" section.`
      : 'This directory is already included. You can manage repositories in the "Choose Repositories" section.';

    LaunchBar.alert('Adding Repositories and Directories:', message);
    return run();
  }

  if (!hasRepositoryInHierarchy(collectionPath)) {
    LaunchBar.alert(
      'No Repositories Found',
      `The selected directory does not contain any Git repositories within ${MAX_REPO_DEPTH} directory levels. Please choose a directory that contains GitHub repositories.`
    );
    return run();
  }

  Action.preferences.collectionDirs = [
    ...currentDirs.filter((dir) => !existingSubdirs.includes(dir)),
    collectionPath,
  ];

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

  return run();
}

function cleanupCollectionDirs() {
  let dirs = Action.preferences.collectionDirs || [];
  if (dirs.length <= 1) return;

  dirs = dirs.reduce((acc, dir) => {
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
}

function readResultsPlist() {
  const plistPath = `${Action.supportPath}/RepoResults.plist`;
  if (!File.exists(plistPath)) return null;
  return File.readPlist(plistPath);
}

function parseRepoUrl(url) {
  const match = url.match(
    /(?:(github|codeberg|gitlab))\.(?:com|org)\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
  );
  if (!match) return null;
  const [, host, owner, name] = match;
  const hostLabels = {
    github: 'GitHub',
    codeberg: 'Codeberg',
    gitlab: 'GitLab',
  };
  return { name, owner, host: hostLabels[host] };
}
