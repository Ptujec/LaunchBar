/* 
New Note in Obsidian by Christian Bender (@ptujec)
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
            var vID = oJSON.vaults[vault].ts

            results.push({
                'title': vName,
                'icon': 'vaultTemplate.png',
                'action': 'setVault',
                'actionArgument': vName
            })
        }
        return results

    } else {
        // LaunchBar.alert('Work in progress')
        var vName = Action.preferences.currentVault
        a = argument.split(':')
        
        var name = a[0]
        var content = a[1]

        if (content == undefined) {
            var content = argument
        }

        LaunchBar.openURL('obsidian://new?vault=' + vName + '&name=' + encodeURI(name) + '&content=' + encodeURI(content));
    }
}

function setVault(vName) {

    Action.preferences.currentVault = vName

    return [{
        'title': '"' + vName + '" will be used for new notes.',
        'icon': 'checkTemplate.png'
    }]
}