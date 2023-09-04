/* 
Local Action Updates Action for LaunchBar
by Christian Bender (@ptujec)
2023-08-17

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const reportDir = `${Action.supportPath}/reports/`;
const actionsDir = `${LaunchBar.homeDirectory}/Library/Application Support/LaunchBar/Actions`;

function run(folderPath) {
  const folderName = File.displayName(folderPath);

  const inputActionPaths = LaunchBar.execute(
    '/usr/bin/find',
    folderPath,
    '-name',
    '*.lbaction',
    '-type',
    'd'
  )
    .trim()
    .split('\n');

  const actionPaths = LaunchBar.execute(
    '/usr/bin/find',
    actionsDir,
    '-name',
    '*.lbaction',
    '-type',
    'd',
    '-maxdepth',
    '1'
  )
    .trim()
    .split('\n');

  const actionIDs = new Map();
  for (const actionPath of actionPaths) {
    const actionPlist = `${actionPath}/Contents/Info.plist`;
    const actionID = File.readPlist(actionPlist).CFBundleIdentifier;
    actionIDs.set(actionID, actionPath);
  }

  let matchCount = 0;
  let newCount = 0;
  let newActions = [];

  for (const inputActionPath of inputActionPaths) {
    const inputActionPlist = File.readPlist(
      `${inputActionPath}/Contents/Info.plist`
    );
    const inputActionID = inputActionPlist.CFBundleIdentifier;

    if (actionIDs.has(inputActionID)) {
      matchCount++;

      const targetActionPath = actionIDs.get(inputActionID);
      const targetActionPlist = File.readPlist(
        `${targetActionPath}/Contents/Info.plist`
      );

      const inputActionVersion = inputActionPlist.CFBundleVersion ?? 'missing';
      const targetActionVersion =
        targetActionPlist.CFBundleVersion ?? 'missing';

      if (inputActionVersion == targetActionVersion) continue;
      newCount++;
      newActions.push({
        inputActionVersion,
        inputActionPath,
        inputActionPlist,
        targetActionVersion,
        targetActionPath,
      });
    }
  }

  processMatches(folderName, matchCount, newCount, newActions);
}

function processMatches(folderName, matchCount, newCount, newActions) {
  if (newCount == 0) {
    LaunchBar.alert(
      'Local Action Updates',
      `${matchCount} match(es). ${newCount} new action(s).`
    );
    return;
  }

  let individual;
  let report = [];

  const response = LaunchBar.alert(
    'Local Action Updates',
    `${matchCount} match(es).\n${newCount} new version(s).\n\nReplace installed action(s) with matching action(s) found in "${folderName}"?`,
    'Ok',
    'Decide individually',
    'Cancel'
  );
  switch (response) {
    case 0:
      individual = false;
      break;

    case 1:
      individual = true;
      break;

    case 2:
      return;
  }

  for (const action of newActions) {
    const inputActionPlist = action.inputActionPlist;
    const inputActionPath = action.inputActionPath;
    const inputActionVersion = action.inputActionVersion;
    const targetActionPath = action.targetActionPath;
    const targetActionVersion = action.targetActionVersion;

    const actionName = inputActionPlist.CFBundleName;
    const inputActionWebsite =
      inputActionPlist.LBDescription.LBWebsiteURL || '';

    const actionInfos = `<p><b>${actionName}</b>:<br>\nPreviously installed version: ${targetActionVersion}.<br>\nUpdated version: ${inputActionVersion}.<br>\n<a href="${inputActionWebsite}">Website</a></p>`;

    if (individual) {
      const response = LaunchBar.alert(
        actionName,
        `Want to replace ${targetActionVersion} with ${inputActionVersion}?`,
        'Ok',
        'Skip',
        'Cancel'
      );
      switch (response) {
        case 0:
          report.push(actionInfos);
          replace(targetActionPath, inputActionPath);
          break;
        case 1:
          break;
        case 2:
          return;
      }
    } else {
      report.push(actionInfos);
      replace(targetActionPath, inputActionPath);
    }
  }

  const summary = `${matchCount} match(es). ${newCount} new version(s).`;
  const summaryHtml = `<p>${summary}</p>`;
  const reportHtml =
    report.length > 0
      ? `${summaryHtml}${report.join('\n\n')}`
      : `${summaryHtml}<p>No changes!</p>`;
  showReport(reportHtml);
}

function replace(targetActionPath, inputActionPath) {
  const targetActionContentsPath = `${targetActionPath}/Contents`;
  const inputActionContentsPath = `${inputActionPath}/Contents`;

  // Delete the Contents directory of the target .lbaction
  LaunchBar.execute('/bin/rm', '-rf', targetActionContentsPath);

  // Copy the Contents directory of the .lbaction from folderPath to the target .lbaction
  LaunchBar.execute(
    '/bin/cp',
    '-R',
    inputActionContentsPath,
    targetActionContentsPath
  );
}

function showReport(reportHtml) {
  const header = '<h1>Action Update Report</h1>';
  const footer =
    '<p>Created with <a href="https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates">Local Action Updates</a> for <a href="https://www.obdev.at/products/launchbar/index.html">LaunchBar</a>.</p>';

  const html = File.readText(Action.path + '/Contents/Resources/template.html')
    .replace('<!-- header -->', header)
    .replace('<!-- report -->', reportHtml)
    .replace('<!-- footer -->', footer);

  const date = new Date().toISOString(); //.split('T')[0];
  const fileName = `report_${date}`;
  const fileLocation = `/private/tmp/${fileName}.html`;

  File.writeText(html, fileLocation);

  LaunchBar.hide();
  LaunchBar.openURL(
    File.fileURLForPath(fileLocation),
    Action.preferences.browser
  );
}
