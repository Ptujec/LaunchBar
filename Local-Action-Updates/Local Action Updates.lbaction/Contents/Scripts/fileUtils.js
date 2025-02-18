/* 
Local Action Updates Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-22

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function findActions(paths) {
  const pathArray = Array.isArray(paths) ? paths : [paths];

  let args = [
    '/usr/bin/find',
    ...pathArray,
    '-name',
    '*.lbaction',
    '-type',
    'd',
  ];

  return LaunchBar.execute(...args)
    .trim()
    .split('\n');
}

function findTargetActions(path) {
  return File.getDirectoryContents(path)
    .filter((item) => item.includes('.lbaction'))
    .map((item) => `${path}/${item}`);
}

function replaceAction(targetPath, inputPath) {
  LaunchBar.execute('/bin/sh', './replace.sh', targetPath, inputPath);
}

function getLocalizedName(path, defaultName) {
  const localePath = `${path}/Contents/Resources/${LaunchBar.currentLocale}.lproj/InfoPlist.strings`;

  try {
    if (!File.exists(localePath)) return defaultName;
    const localePlist = File.readPlist(localePath);
    return localePlist?.CFBundleName || defaultName;
  } catch (error) {
    LaunchBar.log(
      'Error reading localized name:',
      error,
      defaultName,
      'probably has an empty InfoPlist.strings file.'
    );
    return defaultName;
  }
}

function readPlistFromPath(path) {
  if (!File.exists(path)) return null;
  try {
    return File.readPlist(path);
  } catch (error) {
    LaunchBar.log('Error reading plist:', error);
    return null;
  }
}
