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

        var clipb = m.toString().replace(/,/g , '\n')

        LaunchBar.setClipboardString(clipb)

        if (null != m) {
                var result = '[{"icon":"/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/BookmarkIcon.icns","url":"' + m.toString().replace(/,/g, '\"\}\,\{\"icon\"\:\"\/System\/Library\/CoreServices\/CoreTypes\.bundle\/Contents\/Resources\/BookmarkIcon\.icns\"\,\"url\"\:\"') + '","icon":"/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/BookmarkIcon.icns"}]'
                result = eval(result);
                return result;
        } else {
                LaunchBar.alert('No URLs found in this String');
        }
}