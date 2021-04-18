// LaunchBar Action Script

function run(argument) {
    if (argument == undefined) {
        if (LaunchBar.options.alternateKey) {
            LaunchBar.executeAppleScriptFile('./md.applescript');
        } else if (LaunchBar.options.shiftKey) {
            LaunchBar.executeAppleScriptFile('./rtf.applescript');
        } else {
            LaunchBar.executeAppleScriptFile('./url.applescript');
        }        
    } else {
        if (LaunchBar.options.alternateKey) {
            LaunchBar.executeAppleScriptFile('./md_with_argument.applescript', argument);
        } else if (LaunchBar.options.shiftKey) {
            LaunchBar.executeAppleScriptFile('./rtf_with_argument.applescript', argument);
        }
    }
}
// 