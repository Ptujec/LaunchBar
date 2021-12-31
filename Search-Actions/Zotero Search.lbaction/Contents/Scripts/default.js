function run(argument) {
    if (LaunchBar.options.commandKey) {
        var output = LaunchBar.executeAppleScriptFile('./content.applescript', argument)
            .trim()
            .split('\r')
    } else {
        var output = LaunchBar.executeAppleScriptFile('./default.applescript', argument)
            .trim()
            .split('\r')

        if (output == '') {
            output = LaunchBar.executeAppleScriptFile('./content.applescript', argument)
                .trim()
                .split('\r')
        }
    }

    var result = []
    for (var i = 0; i < output.length; i++) {
        result.push({
            path: output[i]
        })
    }

    return result

}