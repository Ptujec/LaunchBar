/*
Run shortcut Action by Christian Bender (@ptujec)

Documentation:
- https://support.apple.com/lt-lt/guide/shortcuts-mac/apd455c82f02/mac
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
*/


function run() {
    var output = LaunchBar.execute('/usr/bin/shortcuts', 'list')
        .trim()
        .split('\n')

    var result = []
    for (var i = 0; i < output.length; i++) {
        result.push({
            'title': output[i],
            'icon' : 'shortcutTemplate.png',
            'action' : 'runShortcut',
            'actionArgument' : output[i],
            actionRunsInBackground: true
        })
    }
    result.sort(function (a, b) {
        return a.title > b.title;
    });
    return result
}

function runShortcut(s) {
    LaunchBar.hide()
    LaunchBar.execute('/usr/bin/shortcuts', 'run', s)
}
