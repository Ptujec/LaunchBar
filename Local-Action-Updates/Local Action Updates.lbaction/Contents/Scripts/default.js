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

function run(folderPath) {
  
  if (!File.exists(folderPath)) {
    LaunchBar.alert('No valid path');
    return;
  }
  
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
