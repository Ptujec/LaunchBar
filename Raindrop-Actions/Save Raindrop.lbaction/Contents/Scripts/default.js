/* 
Save Raindrop - Raindrop.io Action for LaunchBar
Main Action

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.raindrop.io

Todo: 
- Fehler wenn gar nichts im key steht
- Erst nach dem key in der anderen Aktion gucken?
*/

const apiKey = File.readText('~/Library/Application Support/LaunchBar/Actions/Save Raindrop.lbaction/Contents/Resources/api_key.txt')
    .trim()

function run(argument) {

    // Get Title and Link from Safari
    var name = LaunchBar.executeAppleScript('tell application "Safari" to set _URL to name of front document')
        .trim()

    var link = LaunchBar.executeAppleScript('tell application "Safari" to set _URL to URL of front document')
        .trim()

    // Add Tags (argument)
    if (argument != undefined) {
        var tags = argument.split(', ')
    } else {
        var tags = []
    }

    // Post Raindrop
    var answer = HTTP.postJSON('https://api.raindrop.io/rest/v1/raindrop?access_token=' + apiKey, {
        body: {
            "title": name,
            "link": link,
            "tags": tags
        }
    });

    answer = eval('[' + answer.data + ']')

    if (answer[0] != undefined && answer[0].item != undefined) {

        var title = answer[0].item.title
        var link = answer[0].item.link

        if (File.exists('/Applications/Raindrop.io.app')) {
            var url = File.fileURLForPath('/Applications/Raindrop.io.app')
        } else {
            var url = 'https://app.raindrop.io'
        }

        var tags = answer[0].item.tags
            .toString()
            .replace(/(.),(.)/g, '$1, $2')

        return [{
            title: title,
            subtitle : link,
            label: tags,
            icon: 'drop',
            url: url
        }]

    } else if (answer[0] != undefined && answer[0].errorMessage != undefined) {

        var e = answer[0].errorMessage
        if (e == 'Incorrect access_token') {
            setAPIkey()
        } else {
            LaunchBar.alert(e)
        }

    } else if (answer[0] == undefined) {
        // Check internet connection
        var output = LaunchBar.execute('/sbin/ping', '-o', 'www.raindrop.io')
        if (output == '') {
            LaunchBar.alert('You seem to have no internet connection!')
            return
        } else {
            setAPIkey()
        }
    }
}

function setAPIkey() {
    var response = LaunchBar.alert('No valid API key', 'To get your API key \n1) Open Raindrop settings. In the integration section create an "application" and copy its test token. \n2) Run the action again and select "Set API key (from Clipboard)".', 'Open Raindrop.io Settings', 'Set API key (from Clipboard)', 'Cancel');
    switch (response) {
        case 0:
            LaunchBar.openURL('https://app.raindrop.io/settings/integrations')
            LaunchBar.hide()
            break
        case 1:
            var text = LaunchBar.getClipboardString()
            File.writeText(text, '~/Library/Application Support/LaunchBar/Actions/Save Raindrop.lbaction/Contents/Resources/api_key.txt')
            LaunchBar.alert('API key is set to: ' + text + '.')
            break
        case 2:
            break;
    }
}