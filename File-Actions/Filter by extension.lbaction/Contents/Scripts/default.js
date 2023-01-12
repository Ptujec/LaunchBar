/* Filter files in a folder by extension
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-file
*/

function run(folder) {
    var contents = File.getDirectoryContents(folder)

    var extensions = []
    var extensionsCheck = []
    var files = []

    for (var i = 0; i < contents.length; i++) {
        var item = contents[i]
        var p = folder + '/' + item

        if (!File.isDirectory(p)) {
            var e = item
                .match(/\.([\w]+$)/)

            if (e != null) {
                var extension = e[1]
                    .toLowerCase()
            } else {
                var extension = 'blank'
            }

            files.push({
                'title': item,
                'extension': extension,
                'path': p
            })

            if (!extensionsCheck.includes(extension)) {
                extensionsCheck.push(extension)
                extensions.push({
                    'title': extension + ' files',
                    'icon': 'iconTemplate',
                    'action': 'showSelection',
                    'actionArgument': extension
                })
            }
        }
    }
    Action.preferences.recent = files

    extensions.sort(function (a, b) {
        return a.title > b.title;
    });

    return extensions
}

function showSelection(extension) {
    var files = Action.preferences.recent

    files = files.filter(function (el) {
        return el.extension == extension;
    });
    
    return files
}