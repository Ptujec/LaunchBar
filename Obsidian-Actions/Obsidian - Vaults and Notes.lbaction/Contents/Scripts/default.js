/* 
Obsidian - Vaults and Notes by Christian Bender (@ptujec)
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://help.obsidian.md/Advanced+topics/Using+obsidian+URI
- https://stackoverflow.com/questions/19032954/why-is-jsonobject-length-undefined
*/

function run() {
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
            'actionArgument': vPath
        })
    }
    return results
}

function setVault(vPath) {
    var contents = File.getDirectoryContents(vPath);
    var files = []
    for (var i = 0; i < contents.length; i++) {
        var file = contents[i]
        files.push({
            'title': file,
            'icon': 'docTemplate',
            'url': 'obsidian://open?path=' + vPath + file
        })
    }
    return files
}