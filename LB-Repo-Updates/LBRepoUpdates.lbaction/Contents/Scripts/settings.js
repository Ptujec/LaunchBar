/* 
LB Repo Updates Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function listRepositories() {
  const localRoot = Action.preferences.localRoot;
  const includedRepos = Action.preferences.repos || {};

  if (!localRoot) {
    LaunchBar.alert('Please set your local GitHub root directory first');
    return setLocalRoot();
  }

  const repos = File.getDirectoryContents(localRoot)
    .filter((item) => File.exists(`${localRoot}${item}/.git/config`))
    .map((item) => {
      const path = `${localRoot}${item}`;
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

  if (repos.length === 0) {
    LaunchBar.alert('No Git repositories found in ' + localRoot);
    return run();
  }

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

function setLocalRoot() {
  LaunchBar.hide();
  const path = LaunchBar.executeAppleScript(
    `
    tell application "Finder" 
      activate
      set theFolder to choose folder with prompt "Select Local Git Root Directory" default location "${LaunchBar.homeDirectory}"
      return POSIX path of theFolder
    end tell
    `
  );

  if (path) Action.preferences.localRoot = path.trim();
  return run();
}

function getRepoUrlFromConfig(configPath) {
  if (!File.exists(configPath)) return null;
  const config = File.readText(configPath);
  const match = config.match(
    /\[remote "origin"\][^\[]*url\s*=\s*(.+)(?:\n|$)/m
  );
  return match ? match[1].trim() : null;
}
