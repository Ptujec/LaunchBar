/* 
Local Action Updates Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://www.obdev.at/resources/launchbar/help/URLCommands.html
*/

String.prototype.localizationTable = 'default';
include('global.js');
include('fileUtils.js');

function run(input) {
  if (typeof input === 'string' && !isNaN(new Date(parseInt(input)))) {
    const lruPlistPath =
      '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.LBRepoUpdates/Preferences.plist';

    if (File.exists(lruPlistPath)) {
      const lruPlist = File.readPlist(lruPlistPath);
      if (lruPlist?.timestamp == input) return handlePlist(lruPlist);
    }
  }

  if (!File.exists(input)) {
    LaunchBar.alert('No valid path');
    return;
  }

  handleInputPath(input);
}

function handlePlist(lruPlist) {
  const localPaths = Object.values(lruPlist.repos)
    .map((repo) => repo.localPath)
    .filter(Boolean);

  try {
    const results = scanForUpdates(localPaths);
    if (results.newCount > 0) {
      results.updatedActionsList = handleUpdates(results);
    }
    createReport(generateReportHtml(results), 'LaunchBar Repo Updates');
  } catch (error) {
    LaunchBar.alert('Error'.localize(), error.message);
    LaunchBar.log('Error in handlePlist:', error);
  }
}

function handleInputPath(folderPath) {
  try {
    if (folderPath.toString().endsWith('.zip')) {
      const result = LaunchBar.execute('/bin/sh', 'unzip.sh', folderPath);
      if (result?.trim()) {
        folderPath = result.trim();
      } else {
        throw new Error('Failed to extract ZIP file');
      }
    }
    const results = scanForUpdates(folderPath);
    if (results.newCount > 0) {
      results.updatedActionsList = handleUpdates(results);
    }
    createReport(generateReportHtml(results), folderPath);
  } catch (error) {
    LaunchBar.alert('Error'.localize(), error.message);
    LaunchBar.log('Error in run:', error);
  }
}

function scanForUpdates(folderPath) {
  const { inputPaths, targetIDMap } = getActionPaths(folderPath);
  const scanResults = processActionPaths(inputPaths, targetIDMap);
  const { newIDs } = compareBundleIDs(scanResults.bundleIDs);

  return {
    ...scanResults,
    newIDs,
    updatedActionsList: [],
  };
}

function handleUpdates({ matchCount, newCount, newActions, installedActions }) {
  const userChoice = showUpdateAlert(matchCount, newCount);
  if (userChoice === 2) return []; // User cancelled
  return processUpdates(newActions, userChoice === 1, installedActions);
}
