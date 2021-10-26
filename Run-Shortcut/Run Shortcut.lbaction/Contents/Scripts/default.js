// LaunchBar Action Script

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
            'actionArgument' : output[i]
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
