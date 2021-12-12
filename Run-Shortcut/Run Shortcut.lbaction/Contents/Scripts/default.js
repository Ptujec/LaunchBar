/*
Run shortcut Action by Christian Bender (@ptujec)

Documentation:
- https://support.apple.com/lt-lt/guide/shortcuts-mac/apd455c82f02/mac
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
*/

function run() {
    if (LaunchBar.options.alternateKey) {
        var folderList = LaunchBar.execute('/usr/bin/shortcuts', 'list', '--folders')
            .trim()
            .split('\n')

        if (Action.preferences.folder != undefined) {
            var selectedFolder = Action.preferences.folder
        } else {
            var selectedFolder = 'all'
        }

        var folders = []
        for (var i = 0; i < folderList.length; i++) {

            if (selectedFolder == folderList[i]) {
                var icon = 'selectedFolderTemplate'
            } else {
                var icon = 'folderTemplate'
            }

            folders.push({
                'title': folderList[i],
                'icon': icon,
                'action': 'setFolder',
                'actionArgument': folderList[i],
            })
        }
        folders.sort(function (a, b) {
            return a.title > b.title;
        });

        if (LaunchBar.currentLocale == 'de') {
            var aS = 'Alle Shortcuts'
        } else {
            var aS = 'All Shortcuts'
        }

        if (selectedFolder == 'all') {
            var allIcon = 'selectedFolderTemplate'
        } else {
            var allIcon = 'folderTemplate'
        }

        var all = [{
            'title': aS,
            'icon': allIcon,
            'action': 'setFolder',
            'actionArgument': 'all',
        }]
        var result = all.concat(folders)
        return result
    } else {
        var shortcuts = showList()
        return shortcuts;
    }
}

function setFolder(f) {
    Action.preferences.folder = f
    var shortcuts = showList()
    return shortcuts;
}

function showList() {
    var shortcuts = []

    if (LaunchBar.currentLocale == 'de') {
        var aS = 'Alle Shortcuts'
    } else {
        var aS = 'All Shortcuts'
    }

    if (Action.preferences.folder == undefined) {
        var list = LaunchBar.execute('/usr/bin/shortcuts', 'list')
            .trim()
            .split('\n')

        for (var i = 0; i < list.length; i++) {
            shortcuts.push({
                'title': list[i],
                'icon': 'shortcutTemplate.png',
                'action': 'runShortcut',
                'actionArgument': list[i],
                'actionRunsInBackground': true
            })
        }
    } else {
        var selectedFolder = Action.preferences.folder
        if (selectedFolder == 'all') {
            var list = LaunchBar.execute('/usr/bin/shortcuts', 'list')
                .trim()
                .split('\n')

            for (var i = 0; i < list.length; i++) {
                shortcuts.push({
                    'title': list[i],
                    'icon': 'shortcutTemplate.png',
                    'action': 'runShortcut',
                    'actionArgument': list[i],
                    'actionRunsInBackground': true
                })
            }
        } else {
            var list = LaunchBar.execute('/usr/bin/shortcuts', 'list', '--folder-name', selectedFolder)
                .trim()
                .split('\n')

            for (var i = 0; i < list.length; i++) {
                shortcuts.push({
                    'title': list[i],
                    'icon': 'shortcutTemplate.png',
                    'badge': selectedFolder,
                    'action': 'runShortcut',
                    'actionArgument': list[i],
                    'actionRunsInBackground': true
                })
            }
        }
    }

    shortcuts.sort(function (a, b) {
        return a.title > b.title;
    });
    return shortcuts
}

function runShortcut(s) {
    LaunchBar.hide()
    LaunchBar.execute('/usr/bin/shortcuts', 'run', s)
}