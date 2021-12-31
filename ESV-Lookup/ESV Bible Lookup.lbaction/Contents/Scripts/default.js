/* ESV LaunchBar Action Script
ESV API reference: https://api.esv.org/docs/passage-text/
LaunchBar documentation: https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
*/
const apiToken = Action.preferences.apiToken

function run(argument) {
    if (apiToken == undefined) {
        setApiKey()
    } else {
        var result = HTTP.getJSON('https://api.esv.org/v3/passage/text/?q=' + encodeURI(argument) + '&include-passage-references=false&include-verse-numbers=false&include-footnotes=false&include-headings=false&include-short-copyright=false', {
            headerFields: {
                'Authorization': 'Token ' + apiToken
            }
        })

        var passage = result.data.passages
        passage = passage
            .toString()
            .replace(/(\t|\n|\r|\s+)+/g, ' ')
            .trim()

        if (LaunchBar.options.shiftKey) { // Paste
            LaunchBar.paste(passage + '\n' + argument + ' (ESV)')
        } else { // Display in Large Type
            var pL = passage.length
            var lineLength = pL / 7

            if (lineLength < 42) {
                lineLength = 42
            } else if (lineLength > 68) {
                lineLength = 68
            }

            if (pL > 948) {
                // truncate 
                passage = passage.trim()
                passage = passage.substring(0, 948) + "…";
                lineLength = 68
            }

            var arrayOfLines = fold(passage, lineLength);
            passage = arrayOfLines.join('\n').replace(/\n\s/g, '\n');

            // Uncomment if you are using this a lot in Fullscreen mode
            // LaunchBar.executeAppleScript('tell application "Mission Control" to launch');

            argument = argument[0].toUpperCase() + argument.slice(1)

            LaunchBar.displayInLargeType({
                title: argument + ' (ESV)',
                string: passage
            });
        }
    }
}

function fold(s, n, a) {
    a = a || [];
    if (s.length <= n) {
        a.push(s);
        return a;
    }
    var line = s.substring(0, n);
    var lastSpaceRgx = /\s(?!.*\s)/;
    var idx = line.search(lastSpaceRgx);
    var nextIdx = n;
    if (idx > 0) {
        line = line.substring(0, idx);
        nextIdx = idx;
    }
    a.push(line);
    return fold(s.substring(nextIdx), n, a);
}

function setApiKey() {
    var response = LaunchBar.alert(
        "API key required", "1) To obtain an API key, you will first need to  create an API Application.\n2) When done copy the API key.\n3) Press »Set API key«", "Obtain API key", "Set API key", "Cancel"
    );
    switch (response) {
        case 0:
            LaunchBar.openURL('https://api.esv.org/account/create-application/')
            LaunchBar.hide()
            break
        case 1:
            var clipboardConent = LaunchBar.getClipboardString().trim()

            if (clipboardConent.length == 40) {
                // Test API key  
                var test = HTTP.getJSON('https://api.esv.org/v3/passage/text/?q=John+11:35', {
                    headerFields: {
                        'Authorization': 'Token ' + clipboardConent
                    }
                })

                if (test.response.status != 403) {
                    Action.preferences.apiToken = clipboardConent

                    LaunchBar.alert('Success!', 'API key set to: ' + Action.preferences.apiToken + '.')
                } else {
                    LaunchBar.alert(test.response.status + ': ' + test.data.detail)
                }
            } else {
                LaunchBar.alert('The length of the clipboard content does not match the length of a correct API key', 'Make sure the API key is the most recent item in the clipboard!')
            }
            break
        case 2:
            break
    }
}