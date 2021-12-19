/* 
iA Writer Search 
by Ptujec 
2021-07-13
*/

function run(argument) {
    var folderPath = Action.preferences.folderLocation

    if (folderPath == undefined || folderPath == '') {
        try {
            var plist = File.readPlist('~/Library/Containers/pro.writer.mac/Data/Library/Preferences/pro.writer.mac.plist');
        } catch (exception) {
            LaunchBar.alert('Error while reading plist: ' + exception);
        }

        var folderPath = File.pathForFileURL(File.fileURLForPath(plist.NSNavLastRootDirectory))

        if (folderPath == undefined) {
            var folderPath = LaunchBar.executeAppleScript(
                'set _home to path to home folder as string',
                'set _default to _home & "Library:Mobile Documents:" as alias',
                'set _folder to choose folder with prompt "Select a folder for this action:" default location _default',
                'set _folder to POSIX path of _folder')
                .trim()
            Action.preferences.folderLocation = folderPath
        } else {
            Action.preferences.folderLocation = folderPath
        }
    } else if (LaunchBar.options.shiftKey) {
        var folderPath = LaunchBar.executeAppleScript(
            'set _home to path to home folder as string',
            'set _default to _home & "Library:Mobile Documents:" as alias',
            'set _folder to choose folder with prompt "Select a folder for this action:" default location _default',
            'set _folder to POSIX path of _folder')
            .trim()
        Action.preferences.folderLocation = folderPath
    }

    if (argument == undefined) {
        var contents = LaunchBar.execute('/bin/ls', '-tA', folderPath)
            .trim()
            .split('\n')

        var result = []
        for (var i = 0; i < contents.length; i++) {
            var path = folderPath + '/' + contents[i]
            if (contents[i].includes('.txt')) {
                result.push({
                    'title': contents[i],
                    'path': path
                })
            }
        }
        return result

    } else {

        argument = argument
            .toLowerCase()
            .trim()

        if (LaunchBar.options.commandKey) {
            // Dateiname 
            var output = LaunchBar.execute('/usr/bin/mdfind', '-onlyin', folderPath, '-name', argument)
                .split('\n')
        } else {
            var output = LaunchBar.execute('/usr/bin/mdfind', '-onlyin', folderPath, argument)
                .split('\n')
        }

        if (output == '') {
            return [{
                'title': 'Keine Treffer',
                'icon': 'pro.writer.mac'
            }]
        } else {
            var results = []
            for (var i = 0; i < output.length; i++) {
                var result = output[i]
                if (result != '' && !File.isDirectory(result)) {
                    var path = result

                    if (LaunchBar.options.commandKey) {
                        results.push({
                            'path': path
                        })

                    } else {

                        var regex = new RegExp('.*' + argument + '.*', 'gi')
                        try {
                            var sub = File.readText(path)
                                .match(regex)
                        } catch (error) {
                        }

                        if (sub != null) {
                            sub = sub
                                .toString()
                                .replace(/\n/g, ' ')
                                .trim()

                            results.push({
                                'subtitle': sub,
                                'path': path
                            })
                        } else {
                            results.push({
                                'path': path
                            })
                        }
                    }
                }
            }
            results.sort(function (a, b) {
                return a.path > b.path;
            });
            return results
        }
    }
}