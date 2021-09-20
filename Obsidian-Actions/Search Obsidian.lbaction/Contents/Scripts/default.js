/* 
Search Obsidian by Christian Bender (@ptujec)
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://help.obsidian.md/Advanced+topics/Using+obsidian+URI
- https://stackoverflow.com/questions/19032954/why-is-jsonobject-length-undefined
*/

function run(argument) {

    if (argument == undefined) {
        var oJSON = File.readJSON('~/Library/Application Support/obsidian/obsidian.json')
        var vaults = Object.keys(oJSON.vaults)

        var results = []
        for (var i = 0; i < vaults.length; i++) {

            var vault = vaults[i]

            var vPath = oJSON.vaults[vault].path
            var vName = File.displayName(vPath)

            results.push({
                'title': vName,
                'icon': 'vaultTemplate.png',
                'action': 'setVault',
                'actionArgument': vName + ',' + vPath
            })
        }
        return results

    } else {
        var vPath = Action.preferences.currentVaultPath

        argument = argument
            .toLowerCase()
            .trim()

        if (LaunchBar.options.commandKey) {
            // Dateiname 
            var output = LaunchBar.execute('/usr/bin/mdfind', '-onlyin', vPath, '-name', argument)
                .trim()
                .split('\n')
        } else {
            var output = LaunchBar.execute('/usr/bin/mdfind', '-onlyin', vPath, argument)
                .trim()
                .split('\n')

        }

        if (output == '') {
            return [{
                'title': 'No results',
                'icon': 'md.obsidian'
            }]
        } else {
            var results = []
            for (var i = 0; i < output.length; i++) {

                var result = output[i]

                if (result != '' && !File.isDirectory(result)) {

                    var path = result
                    var title = File.displayName(path)

                    if (LaunchBar.options.commandKey) {
                        results.push({
                            'title': title,
                            'icon': 'docTemplate',
                            'url': 'obsidian://open?path=' + path 
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
                                'title': title,
                                'subtitle': sub,
                                'icon': 'docTemplate',
                                'url': 'obsidian://open?path=' + path
                            })
                        } else {
                            results.push({
                                'title': title,
                                'icon': 'docTemplate',
                                'url': 'obsidian://open?path=' + path
                            })
                        }
                    }
                }
            }
            results.sort(function (a, b) {
                return a.title > b.title;
            });
            return results
        }
    }
}

function setVault(v) {
    v = v.split(',')
    var vName = v[0]
    var vPath = v[1]

    Action.preferences.currentVault = vName
    Action.preferences.currentVaultPath = vPath

    return [{
        'title': 'Search in "' + vName + '"',
        'icon': 'checkTemplate.png'
    }]
}