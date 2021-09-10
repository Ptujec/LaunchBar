/* Sort files in a folder by type
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-file
*/

function run(argument) {
    if (argument == undefined) {
        var folder = LaunchBar.executeAppleScriptFile('./open.applescript').trim()
        LaunchBar.hide()
    } else {
        var folder = argument
    }

    var gPlist = File.readPlist('/Library/Preferences/.GlobalPreferences.plist')
    lang = gPlist.AppleLanguages
        .toString()
        .trim()

    if (lang.startsWith('de')) {
        var type = 'Bild'
    } else if (lang.startsWith('en')) {
        var type = 'image'
    } else {
        LaunchBar.alert('Your UI language is unfortunately not supported.')
        return
    }

    var images = LaunchBar.execute('/usr/bin/mdfind', '-onlyin', folder, 'kMDItemKind == \'*' + type + '*\'')
        .trim()
        .split('\n')

    if (images == '') {
        return
    }

    var result = []
    for (var i = 0; i < images.length; i++) {
        var path = images[i]
        var extension = path
            .match(/\.([\w]+$)/)
            .toString()
            .toLowerCase()
        var name = File.displayName(path)

        result.push({
            'title': name,
            'extension': extension,
            'path': path
        })
    }

    if (LaunchBar.options.alternateKey) {
        result.sort(function (a, b) {
            return a.extension > b.extension;
        });
    } else {
        result.sort(function (a, b) {
            return a.title > b.title;
        });
    }

    if (argument == undefined) {
        LaunchBar.executeAppleScript('tell application "LaunchBar" to activate')
    } 
    return result
}