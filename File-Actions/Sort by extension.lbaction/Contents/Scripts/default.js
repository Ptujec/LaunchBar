/* Sort files in a folder by type
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-file
*/

function run(argument) {
    if (argument == undefined) {
        var folder = LaunchBar.executeAppleScript(
            'set f to choose folder with prompt "Pick a folder:"',
            'set p to POSIX path of f')
            .trim()
    } else {
        var folder = argument
    }

    var contents = File.getDirectoryContents(folder)
    
    var files = []
    for (var i = 0; i < contents.length; i++) {
        var item = contents[i]
        var p = folder + '/' + item

        if (!File.isDirectory(p)) {
            var t = item
                .match(/\.([\w]+$)/)
            if (t != null) {
                var type = t[1]
                    .toLowerCase()
            } else {
                var type = 'blank'
            }
            files.push({
                'title' : item,
                'type' :  type,
                'path' : p
            })       
        }
    }
    files.sort(function (a, b) {
        return a.type > b.type;
    });
    return files
}
