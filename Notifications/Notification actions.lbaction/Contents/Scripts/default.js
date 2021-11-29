function run() {
    var output = LaunchBar.executeAppleScriptFile('./getActions.applescript')
        .trim()
        .split(',')

    if (output == '') {
        LaunchBar.hide();
        return;
    }

    var actions = []
    for (var i = 0; i < output.length; i++) {
        var action = output[i].trim()

        if (action != 'AXScrollToVisible' && action != 'drücken' && action != 'press') {
            actions.push({
                title: action,
                icon: 'actionTemplate',
                action: 'runAction',
                actionArgument: action
            })
        }
    }
    return actions
        .reverse()
}

function runAction(argument) {
    LaunchBar.hide()
    LaunchBar.executeAppleScriptFile('./runAction.applescript', argument)
}