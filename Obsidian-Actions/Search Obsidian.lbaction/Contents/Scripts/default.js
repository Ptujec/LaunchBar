/* 
Search Obsidian by Christian Bender (@ptujec)
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://help.obsidian.md/Advanced+topics/Using+obsidian+URI
- https://stackoverflow.com/questions/19032954/why-is-jsonobject-length-undefined
*/

function run(argument) {
    var oJSON = File.readJSON('/Users/hischa/Library/Application Support/obsidian/obsidian.json')
    var vaults = Object.keys(oJSON.vaults)

    var vSetting = Action.preferences.vaultName
    if (argument == undefined) {

        var vResults = []
        for (var i = 0; i < vaults.length; i++) {

            var vault = vaults[i]

            var vPath = oJSON.vaults[vault].path
            var vName = File.displayName(vPath)

            vResults.push({
                'title': vName,
                'icon': 'vaultTemplate.png',
                'action': 'setVault',
                'actionArgument': vName + ',' + vPath
            })
        }

        var allVaults = [{
            'title': 'All Vaults',
            'icon': 'allVaultTemplate.png',
            'action': 'setVault',
            'actionArgument': ''
        }]

        vResults.sort(function (a, b) {
            return a.title > b.title;
        });

        results = allVaults.concat(vResults)

        return results

    } else if (vSetting == '' || vSetting == undefined) {
        argument = argument
            .toLowerCase()
            .trim()

        var results = []
        for (var i = 0; i < vaults.length; i++) {

            var vault = vaults[i]
            var vPath = oJSON.vaults[vault].path
            var vaultName = File.displayName(vPath)

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

            if (output != '') {
                for (var i2 = 0; i2 < output.length; i2++) {
                    var path = output[i2]

                    if (path != '' && !File.isDirectory(path)) {
                        var title = File.displayName(path)

                        if (LaunchBar.options.commandKey) {
                            results.push({
                                'title': title,
                                'icon': 'docTemplate',
                                'badge': vaultName,
                                'url': 'obsidian://open?path=' + encodeURI(path)
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
                                    'badge': vaultName,
                                    'url': 'obsidian://open?path=' + encodeURI(path)
                                })
                            } else {
                                results.push({
                                    'title': title,
                                    'icon': 'docTemplate',
                                    'badge': vaultName,
                                    'url': 'obsidian://open?path=' + encodeURI(path)
                                })
                            }
                        }
                    }
                }
            }
            if (results != '') {
                results.sort(function (a, b) {
                    return a.title < b.title;
                });
            }
        }
        if (results == '') {
            return [{
                'title': 'No results',
                'icon': 'md.obsidian'
            }]
        } else {
            results.sort(function (a, b) {
                return a.badge > b.badge;
            });
            return results
        }

    } else {
        var vPath = Action.preferences.vaultPath

        argument = argument
            .toLowerCase()
            .trim()

        if (LaunchBar.options.commandKey) {
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

    Action.preferences.vaultName = vName
    Action.preferences.vaultPath = vPath

    if (vName == '') {
        return [{
            'title': 'Search in all vaults',
            'icon': 'checkTemplate.png'
        }]
    } else {
        return [{
            'title': 'Search in "' + vName + '"',
            'icon': 'checkTemplate.png'
        }]
    }
}