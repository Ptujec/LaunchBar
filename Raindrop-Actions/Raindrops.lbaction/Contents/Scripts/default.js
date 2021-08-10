/* 
Raindrops - Raindrop.io Action for LaunchBar
Main Action

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.raindrop.io
*/

function run(argument) {
    if (LaunchBar.options.commandKey) {
        if (File.exists('/Applications/Raindrop.io.app')) {
            LaunchBar.openURL(File.fileURLForPath('/Applications/Raindrop.io.app'))
        } else {
            LaunchBar.openURL('https://app.raindrop.io')
        }

    } else {
        // Create API key token file in ~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.Raindrops/ if it does not exist
        if (!File.exists('~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.Raindrops/api_key.txt')) {
            setAPIkey()
        } else {
            const apiKey = File.readText('~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.Raindrops/api_key.txt')
                .trim()

            if (argument != undefined) {
                // Search 
                argument = argument
                    .replace(/,/g, '')
                if (LaunchBar.options.shiftKey) {
                    var rData = HTTP.getJSON(encodeURI('https://api.raindrop.io/rest/v1/raindrops/0?search=[{"key":"tag","val":"' + argument + '"}]&access_token=' + apiKey))
                } else {
                    var rData = HTTP.getJSON(encodeURI('https://api.raindrop.io/rest/v1/raindrops/0?search=[{"key":"word","val":"' + argument + '"}]&access_token=' + apiKey))
                }
            } else {
                // List 25 most recent items
                var rData = HTTP.getJSON('https://api.raindrop.io/rest/v1/raindrops/0?access_token=' + apiKey)
            }

            if (rData.data != undefined && rData.data.items != undefined) {
                var results = [];
                for (var i = 0; i < rData.data.items.length; i++) {
                    var title = rData.data.items[i].title
                    var link = rData.data.items[i].link
                    var tags = rData.data.items[i].tags
                        .toString()
                        .replace(/(.),(.)/g, '$1, $2')

                    results.push({
                        'title': title,
                        'subtitle': link,
                        'label': tags,
                        'icon': 'drop',
                        'url': link
                    });
                }

                if (results == '') {
                    LaunchBar.alert('No raindrop found for "' + argument + '"')
                } else {
                    if (argument != undefined) {
                        results.sort(function (a, b) {
                            return a.title > b.title;
                        });
                    }
                    return results;
                }

            } else if (rData.data != undefined && rData.data.errorMessage != undefined) {
                var e = rData.data.errorMessage
                if (e == 'Incorrect access_token') {
                    setAPIkey()
                } else {
                    LaunchBar.alert(e)
                }

            } else if (rData.data == undefined) {
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
            File.writeText(text, '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.Raindrops/api_key.txt')
            LaunchBar.alert('API key is set to: ' + text + '.')
            break
        case 2:
            break;
    }
}