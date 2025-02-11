/* 
Compile Swift Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-01

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

run = (argument) => {
  const inputPaths =
    Array.isArray(argument) || typeof argument === 'object'
      ? argument
      : argument.split('\n').filter(Boolean);

  // Check if all paths are LaunchBar action bundles
  if (inputPaths.some((path) => !path.toString().endsWith('.lbaction'))) {
    LaunchBar.alert(
      'Make sure you select the action bundle of the action you want to compile.',
      'Use option-right-arrow to select the bundle of a selected action. (LaunchBar action bundles have an .lbaction extension)'
    );
    return;
  }

  // Check if Command Line Tools are available
  if (!File.exists('/Library/Developer/CommandLineTools')) {
    LaunchBar.alert(
      'Command Line Tools missing!',
      'Open the Terminal.app and type "swift" to promt an install dialog.'
    );
    return;
  }

  const response = LaunchBar.alert(
    'Compile Swift Code ',
    'Unfortunately, in order to run smoothly, actions written in Swift need to be both "unquarantined" and compiled. \nThis action will compile swift files inside the action bundle. It will also remove the quarantine attribute from each file in the bundle.\nUse only with actions from developers you trust or code you have verified yourself.\nGo to the action website to learn more.',
    'Ok',
    'Learn more',
    'Cancel'
  );

  switch (response) {
    case 0: {
      const successCount = inputPaths.reduce((count, actionPath) => {
        return count + main(actionPath);
      }, 0);

      if (successCount > 0) {
        LaunchBar.alert(
          'Done!',
          `Compiled ${successCount} Swift script${
            successCount > 1 ? 's' : ''
          } in ${inputPaths.length} action bundle${
            inputPaths.length > 1 ? 's' : ''
          }.`
        );
      } else {
        LaunchBar.alert(
          'Nothing to compile!',
          `No Swift scripts found in ${inputPaths.length} action${
            inputPaths.length > 1 ? 's' : ''
          }.`
        );
      }
      break;
    }

    case 1:
      LaunchBar.openURL(
        'https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#background'
      );
      break;

    case 2:
      break;
  }
};

main = (actionPath) => {
  LaunchBar.execute('/bin/sh', 'unquarantine.sh', actionPath);

  const swiftScripts = getSwiftScripts(actionPath);

  if (swiftScripts.length === 0) return 0;

  const successCount = swiftScripts.reduce(
    (count, script) => count + (compile(script, actionPath) ? 1 : 0),
    0
  );

  return successCount;
};

compile = (swiftScriptPath, actionPath) => {
  const swiftCompiledScriptPath = swiftScriptPath.slice(
    0,
    swiftScriptPath.lastIndexOf('.swift')
  );

  LaunchBar.displayNotification({
    title: 'Compiling Swift Script',
    string: swiftScriptPath,
    url: File.fileURLForPath(`${actionPath}/Contents/Scripts`),
  });

  // Compile swift file with command line tools
  LaunchBar.execute(
    '/usr/bin/swiftc',
    '-O',
    swiftScriptPath,
    '-o',
    swiftCompiledScriptPath
  );

  // Check if File was compiled
  if (!File.exists(swiftCompiledScriptPath)) {
    LaunchBar.alert(
      'Something went wrong.',
      'Could not compile ' + swiftScriptPath
    );
    return;
  }

  // Check if LBSuggestionsScript or LBDefaultScript end on .swift
  const swiftScriptName = File.displayName(swiftScriptPath);
  const swiftCompiledScriptName = File.displayName(swiftCompiledScriptPath);

  const infoPlistPath = `${actionPath}/Contents/Info.plist`;
  const infoPlist = File.readPlist(infoPlistPath);

  // Update script references in Info.plist
  const scriptTypes = {
    LBDefaultScript: infoPlist.LBScripts.LBDefaultScript,
    LBSuggestionsScript: infoPlist.LBScripts.LBSuggestionsScript,
    LBActionURLScript: infoPlist.LBScripts.LBActionURLScript,
  };

  Object.entries(scriptTypes).forEach(([type, script]) => {
    if (!script) return;

    const scriptName = script.LBScriptName;
    if (scriptName?.endsWith('swift') && scriptName === swiftScriptName) {
      infoPlist.LBScripts[type].LBScriptName = swiftCompiledScriptName;
      File.writePlist(infoPlist, infoPlistPath);
    }
  });

  return 'success';
};

getSwiftScripts = (actionPath) => {
  const scriptsDir = `${actionPath}/Contents/Scripts`;
  const contents = File.getDirectoryContents(scriptsDir);
  return contents
    .filter((item) => item.endsWith('.swift'))
    .map((item) => `${scriptsDir}/${item}`);
};
