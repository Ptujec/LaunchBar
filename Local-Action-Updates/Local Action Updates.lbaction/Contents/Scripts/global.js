/* 
Local Action Updates Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-22

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const actionsDir = `${LaunchBar.homeDirectory}/Library/Application Support/LaunchBar/Actions`;
const reportDir = `/private/tmp/`; // `${Action.supportPath}/reports/`;

function getActionPaths(folderPath) {
  const inputPaths = findActions(folderPath);
  const targetPaths = findActions(actionsDir, '1');

  const targetIDMap = new Map(
    targetPaths.map((targetPath) => {
      const targetPlist = readPlistFromPath(
        `${targetPath}/Contents/Info.plist`
      );
      return [targetPlist.CFBundleIdentifier, targetPath];
    })
  );

  return { inputPaths, targetIDMap };
}

function processActionPaths(inputPaths, targetIDMap) {
  // First, group and filter actions by bundle ID
  const inputActions = inputPaths
    .filter((inputPath) => File.exists(`${inputPath}/Contents/Info.plist`))
    .reduce((groups, inputPath) => {
      const inputPlist = readPlistFromPath(`${inputPath}/Contents/Info.plist`);
      const inputID = inputPlist.CFBundleIdentifier;

      const actionInfo = {
        inputPlist,
        inputPath,
        inputVersion: inputPlist.CFBundleVersion ?? 'unknown'.localize(),
        minSystemVersion: inputPlist.LSMinimumSystemVersion || null,
      };

      if (!groups.has(inputID)) {
        groups.set(inputID, []);
      }
      groups.get(inputID).push(actionInfo);
      return groups;
    }, new Map());

  // Get best version for each bundle ID
  const bestVersions = new Map(
    Array.from(inputActions.entries()).map(([id, versions]) => [
      id,
      getBestVersion(versions),
    ])
  );

  // Now compare with installed actions
  return Array.from(bestVersions.entries()).reduce(
    (results, [inputID, actionInfo]) => {
      results.bundleIDs.push(inputID);

      // Handle non-installed actions
      if (!targetIDMap.has(inputID)) {
        results.notInstalledActions.set(inputID, [actionInfo]);
        return results;
      }

      // Process installed actions
      const targetPath = targetIDMap.get(inputID);
      const targetPlist = readPlistFromPath(
        `${targetPath}/Contents/Info.plist`
      );
      const targetVersion = targetPlist.CFBundleVersion ?? 'unknown'.localize();

      results.matchCount++;
      results.installedActions.set(inputID, {
        targetPlist,
        targetPath,
        inputVersion: actionInfo.inputVersion,
        targetVersion,
      });

      // Check for newer version
      if (isNewerVersion(targetVersion, actionInfo.inputVersion)) {
        results.newCount++;
        results.newActions.push({
          ...actionInfo,
          targetVersion,
          targetPath,
        });
      }

      return results;
    },
    {
      matchCount: 0,
      newCount: 0,
      newActions: [],
      bundleIDs: [],
      notInstalledActions: new Map(),
      installedActions: new Map(),
    }
  );
}

function isNewerVersion(targetVersion, inputVersion) {
  const tParts = targetVersion.split('.');
  const iParts = inputVersion.split('.');
  const maxLength = Math.max(tParts.length, iParts.length);

  for (let i = 0; i < maxLength; i++) {
    const a = ~~iParts[i]; // parse int
    const b = ~~tParts[i];
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

function compareBundleIDs(bundleIDs) {
  const recentIDs = Action.preferences.recentIDs || [];
  const newIDs = bundleIDs.filter((id) => !recentIDs.includes(id));
  Action.preferences.recentIDs = [...recentIDs, ...newIDs];
  return { newIDs };
}

function showUpdateAlert(matchCount, newCount) {
  return LaunchBar.alert(
    getLocalizedNameForThisAction(),
    `${matchCount} ${'match(es)'.localize()}.\n${newCount} ${'new version(s)'.localize()}.\n\n${'Replace the old versions with the new ones found in this folder?'.localize()}`,
    'Ok'.localize(),
    'Decide individually'.localize(),
    'Cancel'.localize()
  );
}

function showIndividualUpdateAlert(actionName, targetVersion, inputVersion) {
  return LaunchBar.alert(
    actionName,
    `${'Want to replace'.localize()} ${
      targetVersion === 'unknown'
        ? 'installed version'.localize()
        : targetVersion
    } ${'with'.localize()} ${
      inputVersion === 'unknown' ? 'new version'.localize() : inputVersion
    }?`,
    'Ok'.localize(),
    'Skip'.localize(),
    'Cancel'.localize()
  );
}

function processUpdates(newActions, individual) {
  if (!individual) {
    return newActions.map((action) => {
      replaceAction(action.targetPath, action.inputPath);
      return generateActionHtml(action, 'updated');
    });
  }

  return newActions.reduce((report, action) => {
    const response = showIndividualUpdateAlert(
      action.inputPlist.CFBundleName,
      action.targetVersion,
      action.inputVersion
    );

    if (response === 2) return report; // Cancel
    if (response === 0) {
      // OK
      replaceAction(action.targetPath, action.inputPath);
      report.push(generateActionHtml(action, 'updated'));
    }
    return report;
  }, []);
}

function getBestVersion(versions) {
  if (versions.length === 1) return versions[0];

  // Sort by version, highest first
  const sorted = versions.sort((a, b) => {
    const aVersion = a.inputVersion.split('.').map(Number);
    const bVersion = b.inputVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(aVersion.length, bVersion.length); i++) {
      const aNum = aVersion[i] || 0;
      const bNum = bVersion[i] || 0;
      if (aNum > bNum) return -1;
      if (aNum < bNum) return 1;
    }
    return 0;
  });

  // Find highest compatible version or fallback to highest version
  return (
    sorted.find(
      (v) => !v.minSystemVersion || isCompatibleWithSystem(v.minSystemVersion)
    ) || sorted[0]
  );
}

function isCompatibleWithSystem(minSystemVersion) {
  if (!minSystemVersion) return true;

  const current = 'LaunchBar.systemVersion'
    .split('.')
    .map((n) => parseInt(n, 10));
  const required = minSystemVersion.split('.').map((n) => parseInt(n, 10));

  // If required major version is higher, not compatible
  if (required[0] > current[0]) return false;

  // If current major version is higher, compatible
  if (current[0] > required[0]) return true;

  // Same major version, compare minor
  if (required[1] > current[1]) return false;
  if (current[1] > required[1]) return true;

  // Same major and minor version, compare patch
  // If required patch is not specified, consider it compatible
  return required[2] === undefined || current[2] >= required[2];
}

function generateActionsList(actions, isInstalled = false) {
  return actions
    .map(([_, data]) =>
      isInstalled
        ? generateActionHtml(data, 'installed')
        : generateActionHtml(data[0], 'notInstalled')
    )
    .filter(Boolean)
    .join('\n\n');
}

function generateReportHtml(results) {
  const sections = {
    updates: generateUpdatesSection('Updates', results),
    notInstalled: generateNotInstalledSection(
      results.notInstalledActions,
      results.newIDs
    ),
    installed:
      results.installedActions.size > 0
        ? generateCollapsibleSection(
            'Installed'.localize(),
            generateActionsList(
              Array.from(results.installedActions.entries()),
              true
            )
          )
        : '',
  };

  return sections;
}

function generateUpdatesSection(title, results) {
  const { matchCount, newCount, updatedActionsList } = results;
  return `
    <h2>${title}</h2>
    <p>${matchCount} ${'match(es)'.localize()}.<br>
    ${newCount} ${'new version(s)'.localize()}.${
    updatedActionsList.length > 0
      ? '</p>' + updatedActionsList.join('\n\n')
      : `<br>${'No changes!'.localize()}</p>`
  }`;
}

function generateActionHtml(action, type = 'updated') {
  const { inputPlist, targetPlist, inputPath, targetPath } = action;

  // For non-installed actions, we should always use inputPlist
  const activePlist =
    type === 'notInstalled'
      ? inputPlist
      : type === 'updated'
      ? inputPlist
      : targetPlist;
  const activePath =
    type === 'notInstalled'
      ? inputPath
      : type === 'updated'
      ? inputPath
      : targetPath;

  if (!activePlist) {
    LaunchBar.log('Error: Invalid plist in action:', JSON.stringify(action));
    return '<p>Error: Invalid action data</p>';
  }

  const name = activePlist.CFBundleName || 'Unnamed Action';
  const version =
    type === 'updated'
      ? action.inputVersion
      : action.targetVersion || activePlist.CFBundleVersion || '';
  const author = activePlist.LBDescription?.LBAuthor || 'Unknown'.localize();
  const website = activePlist.LBDescription?.LBWebsiteURL || '';

  const localizedName = activePath ? getLocalizedName(activePath, name) : name;
  const versionString = version === 'unknown' ? '' : version;

  const htmlParts = [
    `<p><b>${localizedName}</b> ${versionString}<br>`,
    `${'Author'.localize()}: ${author}<br>`,
  ];

  if (type === 'updated') {
    htmlParts.push(
      `${'Previously installed version'.localize()}: ${
        action.targetVersion === 'unknown'
          ? 'Unknown'.localize()
          : action.targetVersion
      }<br>`
    );
  } else if (type === 'notInstalled') {
    const selectURL = `x-launchbar:select?file=${encodeURI(activePath)}`;
    htmlParts.push(
      `<a href="${selectURL}">${'Click To Select Action Bundle'.localize()}</a><br>`
    );
  }

  if (website) {
    htmlParts.push(`<a href="${website}">Website</a>`);
  }

  htmlParts.push('</p>');
  return htmlParts.join('\n');
}

function generateNotInstalledSection(notInstalledActions, newInputIDs) {
  if (notInstalledActions.size === 0) return '';

  const filterActions = (filterFn) =>
    Array.from(notInstalledActions.entries()).filter(([id]) => filterFn(id));

  const newActions = filterActions((id) => newInputIDs.includes(id));
  const existingActions = filterActions((id) => !newInputIDs.includes(id));

  const recentDate = Action.preferences.recentDate;

  if (!recentDate || newActions.length === 0) {
    return generateCollapsibleSection(
      'Not Installed'.localize(),
      generateActionsList(Array.from(notInstalledActions.entries()))
    );
  }

  return `
    <h2>${'Not Installed'.localize()}</h2>
    <h3>${'New'.localize()}</h3>
    ${generateActionsList(newActions)}
    ${
      existingActions.length > 0
        ? generateCollapsibleSection(
            'Other'.localize(),
            generateActionsList(existingActions)
          )
        : ''
    }
  `;
}

function generateCollapsibleSection(title, content) {
  const headingLevel =
    title === 'Not Installed'.localize() || title === 'Installed'.localize()
      ? 'h2'
      : 'h3';
  return `
    <details>
      <summary><${headingLevel} style="display: inline;">${title}</${headingLevel}></summary> 
      ${content}
    </details>`;
}

function createReport(sections, folderPath) {
  const folderPathURL = `x-launchbar:select?file=${encodeURI(folderPath)}`;
  const folderPathLink = `<a href="${folderPathURL}">${folderPath
    .toString()
    .replace(LaunchBar.homeDirectory, '~')}</a>`;

  const recentDate = Action.preferences.recentDate;
  const lastUpdateInfo = recentDate
    ? `<br>${'Last Update'.localize()}: ${new Date(
        recentDate
      ).toLocaleString()}`
    : '';

  const date = new Date();
  const localeDate = date.toLocaleString();
  const isoDate = date.toISOString();
  const timestamp = isoDate.replace(/[\:\-\.TZ]/g, '');

  Action.preferences.recentDate = date.toISOString();

  const templateData = {
    bg_light: File.fileURLForPath(
      `${Action.path}/Contents/Resources/bg_light.svg`
    ),
    bg_dark: File.fileURLForPath(
      `${Action.path}/Contents/Resources/bg_dark.svg`
    ),
    title: `${'Action Update Report'.localize()} ${localeDate}`,
    header: `<h1>${'Action Update Report'.localize()}</h1>`,
    metadata: `
      <div class="metadata">
        ${'Source: '.localize() + folderPathLink}<br>
        ${'Generated: '.localize() + localeDate}
        ${lastUpdateInfo}
      </div>
    `,
    updates: sections.updates,
    'not-installed': sections.notInstalled,
    installed: sections.installed,
    footer: `
    <p>
      <div class="metadata">
        ${'Created with'.localize()} 
        <a href="https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates">
          ${getLocalizedNameForThisAction()} ${Action.version} 
        </a> ${'for'.localize()} 
        <a href="https://www.obdev.at/products/launchbar/index.html">
          LaunchBar
        </a>
      </div>
    </p>`,
  };

  const html = File.readText(
    Action.path + '/Contents/Resources/template.html'
  ).replace(
    /<!-- (bg_light|bg_dark|title|header|metadata|updates|not-installed|installed|footer) -->/g,
    (_, key) => templateData[key]
  );

  const reportPath = `${reportDir}report_${timestamp}.html`;
  File.writeText(html, reportPath);

  LaunchBar.hide();
  LaunchBar.openURL(File.fileURLForPath(reportPath));
}

function getLocalizedNameForThisAction() {
  return getLocalizedName(Action.path, 'Local Action Updates');
}
