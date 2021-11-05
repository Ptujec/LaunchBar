// LaunchBar Action Script
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
// https://stackoverflow.com/questions/6038061/regular-expression-to-find-urls-within-a-string

function run(argument) {
        if (argument == undefined) {
                var string = LaunchBar.getClipboardString();
        } else {
                var string = argument;
        }

        var m = string.match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])|(www\.[\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/gi)

        var result = [];
        var i = 0;
        for (i = 0; i < m.length; i++) {
                result.push({
                        'title': m[i],
                        'icon': '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/BookmarkIcon.icns',
                        'actionArgument': m[i],
                        'action' : 'pasteURL'
                })
        }
        return result
}

function pasteURL(theURL) {
        LaunchBar.paste(theURL)
}