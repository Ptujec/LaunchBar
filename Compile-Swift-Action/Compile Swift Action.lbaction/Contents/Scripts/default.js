/* 
Compile Swift Action for LaunchBar
by Christian Bender (@ptujec)
2022-05-26

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(actionPath) {
  // Make sure the path is a LaunchBar action bundle
  if (!actionPath.toString().endsWith('.lbaction')) {
    LaunchBar.alert(
      'This action is meant for LaunchBar action bundles.',
      '(LaunchBar action bundles have an .lbaction extension)'
    );
    return;
  }

  var response = LaunchBar.alert(
    'Compile Swift Code ',
    'Swift code runs faster when compiled.\nThis action will compile swift files inside the action bundle. It will also remove the quarantine attribute from each file in the bundle!\nUse at your own risk with actions from developers you trust.\nGo to the action website to learn more.',
    'Ok',
    'Learn more',
    'Cancel'
  );

  switch (response) {
    case 0:
      const scriptsDir = actionPath + '/Contents/Scripts';
      const swiftScripts = getScripts(scriptsDir);

      var successCount = 0;

      if (swiftScripts.length > 0) {
        swiftScripts.forEach(function (item) {
          var success = main(item, actionPath);

          if (success) {
            successCount++;
          }
        });

        LaunchBar.execute('./unquarantine.sh', actionPath);
        LaunchBar.alert(
          'Done!',
          successCount + ' swift script(s) were compiled'
        );
      } else {
        LaunchBar.alert('No uncompiled swift scripts found in this action!');
      }

      break;

    case 1:
      LaunchBar.openURL(
        'https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action'
      );
      break;

    case 2:
      break;
  }
}

function getScripts(scriptsDir) {
  var dirContent = LaunchBar.execute('/usr/bin/find', scriptsDir).split('\n');

  var swiftScripts = [];
  dirContent.forEach(function (item) {
    if (item.endsWith('.swift')) {
      swiftScripts.push(item);
    }
  });

  return swiftScripts;
}

function main(swiftScriptPath, actionPath) {
  // Check if Command Line Tools are available
  if (!File.exists('/Library/Developer/CommandLineTools')) {
    LaunchBar.alert(
      'Command Line Tools missing!',
      'Open the Terminal.app and type "swift" to promt an install dialog.'
    );
    return;
  }
  var swiftCompiledScriptPath = swiftScriptPath.replace('.swift', '');

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

  const infoPlistPath = actionPath + '/Contents/Info.plist';
  const infoPlist = File.readPlist(infoPlistPath);

  var defaultScriptName = infoPlist.LBScripts.LBDefaultScript.LBScriptName;

  if (defaultScriptName.endsWith('swift')) {
    if (defaultScriptName == swiftScriptName) {
      // Make the compiled file the default script in infoPlist
      infoPlist.LBScripts.LBDefaultScript.LBScriptName =
        swiftCompiledScriptName;
      File.writePlist(infoPlist, infoPlistPath);
    }
  }

  var LBSuggestionsScript = infoPlist.LBScripts.LBSuggestionsScript;

  if (LBSuggestionsScript != undefined) {
    var suggestionScriptName = LBSuggestionsScript.LBScriptName;

    if (suggestionScriptName.endsWith('swift')) {
      if (suggestionScriptName == swiftScriptName) {
        // Make the compiled file the suggestion script in infoPlist
        infoPlist.LBScripts.LBSuggestionsScript.LBScriptName =
          swiftCompiledScriptName;
        File.writePlist(infoPlist, infoPlistPath);
      }
    }
  }

  var LBActionURLScript = infoPlist.LBScripts.LBActionURLScript;

  if (LBActionURLScript != undefined) {
    var actionURLScriptName = LBActionURLScript.LBScriptName;

    if (actionURLScriptName.endsWith('swift')) {
      if (actionURLScriptName == swiftScriptName) {
        // Make the compiled file the suggestion script in infoPlist
        infoPlist.LBScripts.LBActionURLScript.LBScriptName =
          swiftCompiledScriptName;
        File.writePlist(infoPlist, infoPlistPath);
      }
    }
  }

  return 'success';
}
