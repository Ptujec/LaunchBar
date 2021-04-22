// 2021-04-22 Ptujec

function run(argument) {  
    if (LaunchBar.options.commandKey) {
        LaunchBar.executeAppleScriptFile('./pasteMD.applescript', argument);
    } else {
        LaunchBar.executeAppleScriptFile('./paste.applescript', argument);
    }
}