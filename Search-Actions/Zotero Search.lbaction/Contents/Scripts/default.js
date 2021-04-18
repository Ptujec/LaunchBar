function run(argument) {
    if (LaunchBar.options.commandKey) {
        LaunchBar.executeAppleScriptFile('./content.applescript', argument);
    } else {
        var output = LaunchBar.executeAppleScriptFile('./default.applescript', argument);
        if (output == "\n") {
            LaunchBar.executeAppleScriptFile('./content.applescript', argument);
        }
    }
}