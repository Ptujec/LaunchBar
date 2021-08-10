/* 
Save Raindrop - Raindrop.io Action for LaunchBar - Main Action

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.raindrop.io

Other sources: 
- https://apple.stackexchange.com/questions/219582/default-browser-plist-location
- https://apple.stackexchange.com/questions/313454/applescript-find-the-users-set-default-browser
- https://macscripter.net/viewtopic.php?id=22375 MacScripter / fastest way to get the name of the frontmost application?
- https://github.com/raguay/MyLaunchBarActions/blob/92884fb2132e55c922232a80db9ddfb90b2471c4/NotePad%20-%20Set%20Note.lbaction/Contents/Scripts/default.js#L126 - PUT method
*/

function run(argument) {
    
    // Create API key token file in ~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.SaveRaindrop/ if it does not exist
    if (!File.exists('~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.SaveRaindrop/api_key.txt')) {
        setAPIkey()
    } else {

        // Get API key token
        const apiKey = File.readText('~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.SaveRaindrop/api_key.txt')
            .trim()

        // Get default browser
        var browserId = 'com.apple.safari' // if Safari is the only Browser installed or if another Browser is installed and has never had a default Browser set, then the entry in the plist is missing  
        var plist = File.readPlist('~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist')
        for (var i = 0; i < plist.LSHandlers.length; i++) {
            var value = plist.LSHandlers[i].LSHandlerURLScheme
            if (value == 'http') {
                browserId = plist.LSHandlers[i].LSHandlerRoleAll
            }
        }

        // List of supported browsers and Firefox (because of the alert)
        const browsers = ["com.apple.safari", "com.brave.browser", "org.chromium.chromium", "com.google.chrome", "com.vivaldi.vivaldi", "com.microsoft.edgemac", "org.mozilla.firefox"]

        // Check if frontmost app is one of the browsers listed above
        var frontmost = LaunchBar.executeAppleScript('set appID to bundle identifier of (info for (POSIX path of (path to frontmost application as Unicode text)))')
            .trim()
            .toLowerCase()
        if (browsers.includes(frontmost)) {
            browserId = frontmost
        }

        // Get title and URL of links
        if (browserId == 'com.apple.safari') {
            var name = LaunchBar.executeAppleScript('tell application id "' + browserId + '" to set _var to name of front document')
                .trim()
            var link = LaunchBar.executeAppleScript('tell application id "' + browserId + '" to set _var to URL of front document')
                .trim()

        } else if (browserId == 'com.brave.browser' || browserId == 'org.chromium.chromium' || browserId == 'com.google.chrome') {
            var name = LaunchBar.executeAppleScript('tell application id "' + browserId + '" to set _var to the title of the active tab of the front window')
                .trim()
            var link = LaunchBar.executeAppleScript('tell application id "' + browserId + '" to set _var to the URL of the active tab of the front window')
                .trim()

        } else if (browserId == 'com.microsoft.edgemac' || browserId == 'com.vivaldi.vivaldi') {
            var name = LaunchBar.executeAppleScript('tell application id "' + browserId + '" to set _var to the name of the «class acTa» of the front window')
                .trim()
            var link = LaunchBar.executeAppleScript('tell application id "' + browserId + '" to set _var to the «class URL » of the «class acTa» of the front window')
                .trim()
        } else if (browserId == 'org.mozilla.firefox') {
            var responseFirefox = LaunchBar.alert('Firefox is not supported', 'Due to the lack of decent automation options Firefox is not supported. I recommand to use a different browser or try the official Raindrop.io extension for this browser.', 'Install Firefox extension', 'Cancel');
            switch (responseFirefox) {
                case 0:
                    LaunchBar.openURL('https://addons.mozilla.org/de/firefox/addon/raindropio/', 'Firefox')
                    break
                case 1:
                    break;
            }
            LaunchBar.hide()
            return
        }

        // --------------------------------------------------------

        if (link == '') { // No Link found
            LaunchBar.alert('No URL found')
        } else { // Link exists

            // Check if the URL has been saved before  
            var answerCheckURL = HTTP.postJSON('https://api.raindrop.io/rest/v1/import/url/exists?access_token=' + apiKey, {
                body: {
                    "urls": [link]
                }
            });
            answerCheckURL = eval('[' + answerCheckURL.data + ']')

            if (answerCheckURL[0] != undefined && answerCheckURL[0].result == true) { // Options for existing Raindrops

                var responseCheckURL = LaunchBar.alert('You bookmarked this website before!', 'URL: ' + link + '\nDo you want to update the existing entry? WARNING: This will overwrite the existing title and tags!', 'Update', 'Open App', 'Cancel');
                switch (responseCheckURL) {

                    case 0: // Update
                        var rID = answerCheckURL[0].ids

                        // Add Tags (if argument exists)
                        if (argument != undefined) {
                            var tags = argument.split(', ')
                        } else {
                            var tags = []
                        }

                        // PUT method
                        var putURL = 'https://api.raindrop.io/rest/v1/raindrop/' + rID + '/?access_token=' + apiKey
                        var req = HTTP.createRequest(putURL, {
                            method: 'PUT',
                            body: {
                                "title": name,
                                "link": link,
                                "tags": tags
                            },
                            bodyType: 'json'
                        })
                        var answerUpdate = HTTP.loadRequest(req)

                        answerUpdate = eval('[' + answerUpdate.data + ']')

                        if (answerUpdate[0] != undefined && answerUpdate[0].item != undefined) {

                            var title = answerUpdate[0].item.title
                            var link = answerUpdate[0].item.link

                            if (File.exists('/Applications/Raindrop.io.app')) {
                                var url = File.fileURLForPath('/Applications/Raindrop.io.app')
                            } else {
                                var url = 'https://app.raindrop.io'
                            }

                            var tags = answerUpdate[0].item.tags
                                .toString()
                                .replace(/(.),(.)/g, '$1, $2')

                            return [{
                                title: 'Updated: ' + title,
                                subtitle: link,
                                label: tags,
                                icon: 'drop',
                                url: url
                            }]

                        } else if (answerUpdate[0] != undefined && answerUpdate[0].errorMessage != undefined) {

                            var e = answerUpdate[0].errorMessage
                            if (e == 'Incorrect access_token') {
                                setAPIkey()
                            } else {
                                LaunchBar.alert(e)
                            }

                        } else if (answerUpdate[0] == undefined) {
                            // Check internet connection
                            var output = LaunchBar.execute('/sbin/ping', '-o', 'www.raindrop.io')
                            if (output == '') {
                                LaunchBar.alert('You seem to have no internet connection!')
                                return
                            } else {
                                setAPIkey()
                            }
                        }
                        break

                    case 1: // Open App
                        if (File.exists('/Applications/Raindrop.io.app')) {
                            LaunchBar.openURL(File.fileURLForPath('/Applications/Raindrop.io.app'))
                        } else {
                            LaunchBar.openURL('https://app.raindrop.io')
                        }
                        break;

                    case 2: // Cancel
                        break;
                }

            } else if (answerCheckURL[0] != undefined && answerCheckURL[0].result == false) { // Post new Raindrop

                // Add Tags (if argument exists)
                if (argument != undefined) {
                    var tags = argument.split(', ')
                } else {
                    var tags = []
                }

                // Post Raindrop
                var answerPost = HTTP.postJSON('https://api.raindrop.io/rest/v1/raindrop?access_token=' + apiKey, {
                    body: {
                        "title": name,
                        "link": link,
                        "tags": tags
                    }
                });

                answerPost = eval('[' + answerPost.data + ']')

                if (answerPost[0] != undefined && answerPost[0].item != undefined) {

                    var title = answerPost[0].item.title
                    var link = answerPost[0].item.link

                    if (File.exists('/Applications/Raindrop.io.app')) {
                        var url = File.fileURLForPath('/Applications/Raindrop.io.app')
                    } else {
                        var url = 'https://app.raindrop.io'
                    }

                    var tags = answerPost[0].item.tags
                        .toString()
                        .replace(/(.),(.)/g, '$1, $2')

                    return [{
                        title: 'Saved: ' + title,
                        subtitle: link,
                        label: tags,
                        icon: 'drop',
                        url: url
                    }]

                } else if (answerPost[0] != undefined && answerPost[0].errorMessage != undefined) {

                    var e = answerPost[0].errorMessage
                    if (e == 'Incorrect access_token') {
                        setAPIkey()
                    } else {
                        LaunchBar.alert(e)
                    }

                } else if (answerPost[0] == undefined) {
                    // Check internet connection
                    var output = LaunchBar.execute('/sbin/ping', '-o', 'www.raindrop.io')
                    if (output == '') {
                        LaunchBar.alert('You seem to have no internet connection!')
                        return
                    } else {
                        setAPIkey()
                    }
                }

            } else if (answerCheckURL[0] != undefined && answerCheckURL[0].errorMessage != undefined) { // Error handling

                var e = answer[0].errorMessage
                if (e == 'Incorrect access_token') {
                    setAPIkey()
                } else {
                    LaunchBar.alert(e)
                }

            } else if (answerCheckURL[0] == undefined) { // Error handling
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
            File.writeText(text, '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.SaveRaindrop/api_key.txt')
            LaunchBar.alert('API key is set to: ' + text + '.')
            break
        case 2:
            break;
    }
}