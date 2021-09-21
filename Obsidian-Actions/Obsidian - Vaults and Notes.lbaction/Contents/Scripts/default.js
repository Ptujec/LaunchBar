/* 
Obsidian - Vaults and Notes by Christian Bender (@ptujec)
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://help.obsidian.md/Advanced+topics/Using+obsidian+URI
- https://stackoverflow.com/questions/19032954/why-is-jsonobject-length-undefined
*/

function run() {
    var oJSON = File.readJSON('~/Library/Application Support/obsidian/obsidian.json')
    var vaults = Object.keys(oJSON.vaults)

    var vaultResults = []
    for (var i = 0; i < vaults.length; i++) {

        var vault = vaults[i]
        var vPath = oJSON.vaults[vault].path + '/'
        var vName = File.displayName(vPath)

        vaultResults.push({
            'title': vName,
            'icon': 'vaultTemplate.png',
            'action': 'setVault',
            'actionArgument': vPath
        })
    }
    vaultResults.sort(function (a, b) {
        return a.title > b.title;
    });
    return vaultResults
}

function setVault(vPath) {
    var contents = File.getDirectoryContents(vPath);
    var folders = []
    var files = []
    for (var i = 0; i < contents.length; i++) {
        var item = contents[i]

        if (!item.includes('.')) {
            var folder = item + '/'
            folders.push({
                'title': item,
                'icon': 'folderTemplate',
                'path': vPath + folder,
                'action': 'openFolder',
                'actionArgument': vPath + folder,
                'type': '01'
            })
        } else {
            var url = 'obsidian://open?path=' + encodeURI(vPath + item)
            files.push({
                'title': item,
                'icon': 'docTemplate',
                'url': url,
                'type': '02'
            })
        }
    }
    folders.sort(function (a, b) {
        return a.title > b.title;
    });
    files.sort(function (a, b) {
        return a.title > b.title;
    });
    var items = folders.concat(files)
    return items
}

function openFolder(fPath) {
    var contents = File.getDirectoryContents(fPath);
    var folders = []
    var files = []
    for (var i = 0; i < contents.length; i++) {
        var item = contents[i]

        if (!item.includes('.')) {
            var folder = item + '/'
            folders.push({
                'title': item,
                'icon': 'folderTemplate',
                'path': fPath + folder,
                'action': 'openFolder',
                'actionArgument': fPath + folder,
                'type': '01'
            })
        } else {
            var url = 'obsidian://open?path=' + encodeURI(fPath + item)
            files.push({
                'title': item,
                'icon': 'docTemplate',
                'url': url,
                'type': '02'
            })
        }

    }
    folders.sort(function (a, b) {
        return a.title > b.title;
    });
    files.sort(function (a, b) {
        return a.title > b.title;
    });
    var items = folders.concat(files)
    return items
}