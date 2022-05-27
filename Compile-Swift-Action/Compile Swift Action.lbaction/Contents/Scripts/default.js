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
    'Compile Swift Code',
    'Swift code runs faster when compiled.\nThis action will compile the main swift file into an executable and remove the malware warning!\nThe malware warning appears for downloaded unsigned actions with executables even if the executable was compiled by you.\nUse at your own risk with actions from developers you trust.',
    'Ok',
    'Cancel'
  );
  switch (response) {
    case 0:
      main(actionPath);
    case 1:
      break;
  }

  function main(actionPath) {
    // Check if default action script is an uncompiled swift file
    var infoPlistPath = actionPath + '/Contents/Info.plist';
    var infoPlist = File.readPlist(infoPlistPath);
    var LBScriptName = infoPlist.LBScripts.LBDefaultScript.LBScriptName;

    if (!LBScriptName.endsWith('.swift')) {
      LBScriptName = LBScriptName + '.swift';
    }

    var scriptsDir = actionPath + '/Contents/Scripts/';
    var uncompiledFile = scriptsDir + LBScriptName;

    // Check for default.swift
    if (!File.exists(uncompiledFile)) {
      uncompiledFile = actionPath + '/Contents/Scripts/default.swift';
    }

    // Check for main.swift
    if (!File.exists(uncompiledFile)) {
      var dirContent = LaunchBar.execute('/usr/bin/find', scriptsDir).split(
        '\n'
      );

      dirContent.forEach(function (item) {
        if (item.endsWith('main.swift')) {
          uncompiledFile = item;
        }
      });
    }

    if (!File.exists(uncompiledFile)) {
      LaunchBar.alert('No valid swift file found!');
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

    // Compile swift file with command line tools and
    LaunchBar.execute('/usr/bin/swiftc', '-O', uncompiledFile, '-o', 'default');

    // Move compiled file to the actions directory
    var outputFile = Action.path + '/Contents/Scripts/default';

    if (!File.exists(outputFile)) {
      LaunchBar.alert('File not ready!');
      return;
    }

    var outputDir = actionPath + '/Contents/Scripts/default';
    LaunchBar.execute('/bin/mv', outputFile, outputDir);

    // Make the compiled file the default script in infoPlist
    infoPlist.LBScripts.LBDefaultScript.LBScriptName = 'default';
    File.writePlist(infoPlist, infoPlistPath);

    LaunchBar.execute('./unquarantine.sh', actionPath);

    LaunchBar.alert('Done!');
  }
}
